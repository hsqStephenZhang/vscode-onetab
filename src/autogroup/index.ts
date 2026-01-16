import * as vscode from 'vscode';
import { getAllTabsWithBlackList, sendTabs } from '../utils/tab';
import { Global } from '../global';

const schema = "{group_name: [file_names]}"

const strategy_dir = `the strategy is "directory structure", which means you should consider the file path as the directory 
structure, and merge the child's list into the parent's one, and ignore the file extension type`
const strategy_file_ext = `the strategy is "file extension type", which means you should group the files by their extension type. 
For example, put all "*.txt" files into one group, and all "*.rs" files into another`
const strategy_filename = `the strategy is "filename", which means you should group files by their names, and ignore the file 
extension type`

const strategies_map: Map<string, string> = new Map([
    ["directory", strategy_dir],
    ["file type", strategy_file_ext],
    ["file name", strategy_filename]
]);

interface CustomStrategy {
    name: string;
    description: string;
}

// Get custom strategies from settings
function getCustomStrategies(): CustomStrategy[] {
    const config = vscode.workspace.getConfiguration("onetab.autogroup");
    const customStrategies = config.get<CustomStrategy[]>("customStrategies", []);
    return customStrategies;
}

// Save custom strategies to settings
async function saveCustomStrategies(strategies: CustomStrategy[]): Promise<void> {
    const config = vscode.workspace.getConfiguration("onetab.autogroup");
    await config.update("customStrategies", strategies, vscode.ConfigurationTarget.Global);
}

// Add a new custom strategy
async function addCustomStrategy(): Promise<CustomStrategy | undefined> {
    const name = await vscode.window.showInputBox({
        prompt: "Enter a name for your custom strategy",
        placeHolder: "e.g., Feature Modules, Test Files, etc.",
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return "Strategy name cannot be empty";
            }
            const existing = getCustomStrategies();
            if (existing.some(s => s.name.toLowerCase() === value.trim().toLowerCase())) {
                return "A strategy with this name already exists";
            }
            return null;
        }
    });

    if (!name) {
        return undefined;
    }

    const description = await vscode.window.showInputBox({
        prompt: "Enter a description for your custom strategy",
        placeHolder: "e.g., Group by feature modules (auth, dashboard, settings, etc.)",
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return "Strategy description cannot be empty";
            }
            return null;
        }
    });

    if (!description) {
        return undefined;
    }

    const strategy: CustomStrategy = {
        name: name.trim(),
        description: description.trim()
    };

    const existing = getCustomStrategies();
    existing.push(strategy);
    await saveCustomStrategies(existing);

    vscode.window.showInformationMessage(`Custom strategy '${strategy.name}' saved!`);
    return strategy;
}

// Manage custom strategies (edit/delete)
async function manageCustomStrategies(): Promise<void> {
    const strategies = getCustomStrategies();

    if (strategies.length === 0) {
        const action = await vscode.window.showInformationMessage(
            "No custom strategies found. Would you like to create one?",
            "Create Strategy", "Cancel"
        );
        if (action === "Create Strategy") {
            await addCustomStrategy();
        }
        return;
    }

    interface StrategyActionItem extends vscode.QuickPickItem {
        strategy?: CustomStrategy;
        action: 'edit' | 'delete' | 'add';
    }

    const items: StrategyActionItem[] = [
        {
            label: "$(add) Add New Strategy",
            description: "Create a new custom grouping strategy",
            action: 'add'
        },
        { label: "", kind: vscode.QuickPickItemKind.Separator, action: 'add' } as any,
        ...strategies.map(s => ({
            label: s.name,
            description: s.description,
            detail: "Click to edit or delete",
            strategy: s,
            action: 'edit' as const
        }))
    ];

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a strategy to edit/delete, or add a new one"
    });

    if (!selected) {
        return;
    }

    if (selected.action === 'add') {
        await addCustomStrategy();
        return;
    }

    if (selected.strategy) {
        const action = await vscode.window.showQuickPick([
            { label: "$(edit) Edit", value: 'edit' },
            { label: "$(trash) Delete", value: 'delete' },
            { label: "$(close) Cancel", value: 'cancel' }
        ], {
            placeHolder: `What would you like to do with '${selected.strategy.name}'?`
        });

        if (!action || action.value === 'cancel') {
            return;
        }

        if (action.value === 'delete') {
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to delete the strategy '${selected.strategy.name}'?`,
                { modal: true },
                "Delete"
            );

            if (confirm === "Delete") {
                const updated = strategies.filter(s => s.name !== selected.strategy!.name);
                await saveCustomStrategies(updated);
                vscode.window.showInformationMessage(`Strategy '${selected.strategy.name}' deleted.`);
            }
        } else if (action.value === 'edit') {
            const newDescription = await vscode.window.showInputBox({
                prompt: `Edit description for '${selected.strategy.name}'`,
                value: selected.strategy.description,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return "Strategy description cannot be empty";
                    }
                    return null;
                }
            });

            if (newDescription) {
                const updated = strategies.map(s =>
                    s.name === selected.strategy!.name
                        ? { ...s, description: newDescription.trim() }
                        : s
                );
                await saveCustomStrategies(updated);
                vscode.window.showInformationMessage(`Strategy '${selected.strategy.name}' updated!`);
            }
        }
    }
}

export function buildPrompt(strategies_list: string[], source: string, customStrategyDescriptions?: string[]): string {
    let strategies = strategies_list.map((strategy) => strategies_map.get(strategy)).filter((c) => c !== undefined).join(", ")

    // If custom strategies are provided, append them
    if (customStrategyDescriptions && customStrategyDescriptions.length > 0) {
        const customPart = customStrategyDescriptions.join(", ");
        if (strategies) {
            strategies += `, ${customPart}`;
        } else {
            strategies = customPart;
        }
    }

    let prompt = `I have a list of files, please group them by the strategies: ${strategies}.
If there are multiple strategies, please choose the best one. 
The schema of json output are: ${schema}.
Please output pure json string, and don't output any extra explanations.
Please name each group with the strategy and extra explainations, but keep short.
Please keep files' original full names in the output values lists.
The given files are: ${source}`
    return prompt
}

// New function to request auto group using VS Code's Language Model API (Copilot)
export async function requestAutoGroupWithCopilot(strategies_list: string[], filenames: string[], customStrategyDescriptions?: string[]): Promise<Map<string, string[]> | undefined> {
    try {
        // Check if language models are available
        const models = await vscode.lm.selectChatModels({
            vendor: 'copilot',
            family: 'gpt-4'
        });

        if (models.length === 0) {
            Global.logger.info("No Copilot models available");
            return undefined;
        }

        const model = models[0];
        Global.logger.info(`Using Copilot model: ${model.id}`);

        let source = filenames.map((name) => `"${name}"`).join(", ");
        let prompt = buildPrompt(strategies_list, `[${source}]`, customStrategyDescriptions);

        const messages = [
            vscode.LanguageModelChatMessage.User(prompt)
        ];

        const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

        let text = '';
        for await (const fragment of response.text) {
            text += fragment;
        }

        if (!text) {
            Global.logger.warn("Empty response from Copilot");
            return undefined;
        }

        // Try to extract JSON from the response (in case there's extra text)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            Global.logger.warn("No JSON found in Copilot response");
            return undefined;
        }

        let resp = JSON.parse(jsonMatch[0]);
        const groups = new Map<string, string[]>(Object.entries(resp));
        return groups;
    } catch (error) {
        Global.logger.error(`Error using Copilot: ${error}`);
        return undefined;
    }
}

// Unified function that tries Copilot first, then falls back to Claude
export async function requestAutoGroup(strategies_list: string[], filenames: string[], customStrategyDescriptions?: string[]): Promise<Map<string, string[]> | undefined> {
    // First, try to use Copilot if available
    try {
        const copilotResult = await requestAutoGroupWithCopilot(strategies_list, filenames, customStrategyDescriptions);
        if (copilotResult !== undefined) {
            Global.logger.info("Successfully used Copilot for auto-grouping");
            return copilotResult;
        }
    } catch (error) {
        Global.logger.debug(`Copilot not available: ${error}`);
    }

    return undefined;
}

interface StrategyQuickPickItem extends vscode.QuickPickItem {
    value: string;
    isCustom?: boolean;
    customStrategy?: CustomStrategy;
}

export async function autoGroup(): Promise<any> {
    // 1. get all the files
    let allTabs = await getAllTabsWithBlackList();
    if (allTabs === undefined) {
        return
    }
    let filenames = allTabs.map((file) => file.input as vscode.TabInputText).map((input) => input.uri.path);

    // 2. get the strategies with custom options
    const customStrategies = getCustomStrategies();

    const strategyItems: StrategyQuickPickItem[] = [
        { label: "directory", description: "Group by directory structure", value: "directory" },
        { label: "file type", description: "Group by file extension", value: "file type" },
        { label: "file name", description: "Group by file name patterns", value: "file name" }
    ];

    // Add separator if there are custom strategies
    if (customStrategies.length > 0) {
        strategyItems.push({
            label: "Custom Strategies",
            kind: vscode.QuickPickItemKind.Separator,
            value: ""
        } as any);

        // Add custom strategies
        customStrategies.forEach(cs => {
            strategyItems.push({
                label: `$(star) ${cs.name}`,
                description: cs.description,
                value: cs.name,
                isCustom: true,
                customStrategy: cs
            });
        });
    }

    // Add management options
    strategyItems.push({
        label: "Actions",
        kind: vscode.QuickPickItemKind.Separator,
        value: ""
    } as any);

    strategyItems.push({
        label: "$(add) Create New Strategy",
        description: "Define and save a new custom strategy",
        value: "__create__"
    });

    strategyItems.push({
        label: "$(settings-gear) Manage Custom Strategies",
        description: "Edit or delete existing custom strategies",
        value: "__manage__"
    });

    let res = await vscode.window.showQuickPick(strategyItems, {
        canPickMany: true,
        placeHolder: "Choose strategies to group files (you can select multiple)"
    }).then(async (selectedItems) => {
        if (!selectedItems || selectedItems.length === 0) {
            return undefined;
        }

        // Handle management actions
        const hasCreate = selectedItems.some(item => item.value === "__create__");
        const hasManage = selectedItems.some(item => item.value === "__manage__");

        if (hasManage) {
            await manageCustomStrategies();
            // Restart the process
            return autoGroup();
        }

        if (hasCreate) {
            await addCustomStrategy();
            // Restart the process
            return autoGroup();
        }

        // Get built-in strategies
        const builtInStrategies = selectedItems
            .filter(item => !item.isCustom && item.value)
            .map(item => item.value);

        // Get custom strategy descriptions
        const customStrategyDescriptions = selectedItems
            .filter(item => item.isCustom && item.customStrategy)
            .map(item => item.customStrategy!.description);

        if (builtInStrategies.length === 0 && customStrategyDescriptions.length === 0) {
            vscode.window.showWarningMessage("Please select at least one strategy");
            return undefined;
        }

        // 3. request and parse the response into our tabgroup & tabitem
        const result = await requestAutoGroup(builtInStrategies, filenames, customStrategyDescriptions);

        return result;
    });

    if (res === undefined) {
        return;
    }

    if (res instanceof Promise) {
        // If autoGroup was called recursively, return the promise
        return res;
    }

    Global.logger.debug(`auto group result: ${JSON.stringify(res)}`)

    // 4. create the tab groups and tab items
    for (let [group_name, file_names] of res) {
        let tabs = allTabs.filter((tab) => {
            let path = (tab.input as vscode.TabInputText).uri.path;
            return file_names.includes(path);
        });
        await sendTabs(tabs, undefined, group_name);
    }
}

// Export the manage function so it can be registered as a command
export { manageCustomStrategies };