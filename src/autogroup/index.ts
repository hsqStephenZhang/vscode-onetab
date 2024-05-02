import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
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
    ["dir", strategy_dir],
    ["ext", strategy_file_ext],
    ["filename", strategy_filename]
]);

export function buildPrompt(strategies_list: string[], source: string): string {
    let strategies = strategies_list.map((strategy) => strategies_map.get(strategy)).filter((c) => c !== undefined).join(", ")
    let prompt = `I have a list of files, please group them by the strategies: ${strategies}.
If there are multiple strategies, please choose a best one. 
The schema of json output are: ${schema}.
Please output pure json string, and don't output any extra explanations.
Please name each group with the strategy and extra explainations, but keep short.
Please keep files' original full names in the output values lists.
The given files are: ${source}`
    return prompt
}

// shall use process.env["ANTHROPIC_API_KEY"] in test
export async function requestAutoGroup(apiKey: string, strategies_list: string[], filenames: string[]): Promise<Map<string, string[]> | undefined> {

    const anthropic = new Anthropic({
        apiKey: apiKey,
    });

    let source = filenames.map((name) => `"${name}"`).join(", ");
    let prompt = buildPrompt(strategies_list, `[${source}]`);

    const msg = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
    });
    if (msg.content.length === 0) {
        return undefined
    }
    let text = msg.content[0].text;
    let resp = JSON.parse(text);
    const groups = new Map<string, string[]>(Object.entries(resp));
    return groups
}

export async function autoGroup() {
    // 0. check if the api key is set
    let config = vscode.workspace.getConfiguration("onetab.autogroup.apikeys");
    let apiKey = config.get("claude");
    if (apiKey === undefined) {
        await vscode.window.showInputBox({
            "prompt": "Please set the claude's api key for the autogroup feature (will be saved in settings)",
        }).then((key) => {
            if (key !== undefined) {
                config.update("claude", key, vscode.ConfigurationTarget.Global);
            }
            apiKey = key
        })
    }
    if (apiKey === undefined) {
        return
    }

    // 1. get all the files
    let allTabs = await getAllTabsWithBlackList();
    if (allTabs === undefined) {
        return
    }
    let filenames = allTabs.map((file) => file.input as vscode.TabInputText).map((input) => input.uri.path);

    // 2. get the strategies
    let strategies = ["dir", "ext", "filename"];
    let res = await vscode.window.showQuickPick(strategies, {
        canPickMany: true,
        placeHolder: "Please choose the strategies to group the files"
    }).then((strategies) => {
        if (strategies === undefined) {
            return
        }
        // 3. request and parse the response into our tabgroup & tabitem
        return requestAutoGroup(apiKey as string, strategies, filenames)
    })
    if (res === undefined) {
        return;
    }

    Global.logger.debug(`auto group result: ${JSON.stringify(res)}`)

    // 4. create the tab groups and tab items
    for (let [group_name, file_names] of res) {
        let tabs = allTabs.filter((tab) => {
            let path = (tab.input as vscode.TabInputText).uri.path;
            return file_names.includes(path);
        });
        sendTabs(tabs, undefined, group_name);
    }

}