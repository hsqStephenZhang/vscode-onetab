// Copyright (c) 2022 hsqStephenZhang
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from 'vscode';
import * as assert from 'assert';
import { plainToClass } from "class-transformer";
import 'reflect-metadata';
import { TabsState } from '../../model/tabstate';

const testJson = `{"groups":{"fb7cd278-ee69-4088-8e32-51af3ca3fc34":{"collapsibleState":1,"label":"alice1","id":"fb7cd278-ee69-4088-8e32-51af3ca3fc34","pinned":true,"tags":[],"createTime":1713951298453,"tabs":[{"collapsibleState":0,"label":"CODE_OF_CONDUCT.md","parentId":"fb7cd278-ee69-4088-8e32-51af3ca3fc34","id":"ffe7cf35-f1e4-4f84-acb0-608829bf58a7","fileUri":{"scheme":"file","authority":"","path":"/Users/zc/codespace/js/minisearch/CODE_OF_CONDUCT.md","query":"","fragment":"","_formatted":"file:///Users/zc/codespace/js/minisearch/CODE_OF_CONDUCT.md","_fsPath":"/Users/zc/codespace/js/minisearch/CODE_OF_CONDUCT.md"},"contextValue":"tab","iconPath":{"id":"output-view-icon"}},{"collapsibleState":0,"label":"package.json","parentId":"fb7cd278-ee69-4088-8e32-51af3ca3fc34","id":"1e58f095-53d4-4480-a2b2-d24e9132fe19","fileUri":{"scheme":"file","authority":"","path":"/Users/zc/codespace/js/minisearch/package.json","query":"","fragment":"","_formatted":"file:///Users/zc/codespace/js/minisearch/package.json","_fsPath":"/Users/zc/codespace/js/minisearch/package.json"},"contextValue":"tab","iconPath":{"id":"output-view-icon"}},{"collapsibleState":0,"label":"tsconfig.json","parentId":"fb7cd278-ee69-4088-8e32-51af3ca3fc34","id":"a13e4ba2-f750-4429-89b6-98adf9bccc4e","fileUri":{"scheme":"file","authority":"","path":"/Users/zc/codespace/js/minisearch/tsconfig.json","query":"","fragment":"","_formatted":"file:///Users/zc/codespace/js/minisearch/tsconfig.json","_fsPath":"/Users/zc/codespace/js/minisearch/tsconfig.json"},"contextValue":"tab","iconPath":{"id":"output-view-icon"}},{"collapsibleState":0,"label":"MiniSearch.svg","parentId":"fb7cd278-ee69-4088-8e32-51af3ca3fc34","id":"133900a3-1af7-449a-bed3-5c92ee948249","fileUri":{"scheme":"file","authority":"","path":"/Users/zc/codespace/js/minisearch/MiniSearch.svg","query":"","fragment":"","_formatted":"file:///Users/zc/codespace/js/minisearch/MiniSearch.svg","_fsPath":"/Users/zc/codespace/js/minisearch/MiniSearch.svg"},"contextValue":"tab","iconPath":{"id":"output-view-icon"}},{"collapsibleState":0,"label":"yarn.lock","parentId":"fb7cd278-ee69-4088-8e32-51af3ca3fc34","id":"aca7af9e-1595-4beb-918d-e36df928a7e4","fileUri":{"scheme":"file","authority":"","path":"/Users/zc/codespace/js/minisearch/yarn.lock","query":"","fragment":"","_formatted":"file:///Users/zc/codespace/js/minisearch/yarn.lock","_fsPath":"/Users/zc/codespace/js/minisearch/yarn.lock"},"contextValue":"tab","iconPath":{"id":"output-view-icon"}}],"contextValue":"tabsGroup","tooltip":"alice1, tags: none","iconPath":{"dark":{"scheme":"file","authority":"","path":"/Users/zc/codespace/js/vscode-onetab/media/pin-light.svg","query":"","fragment":"","_formatted":null,"_fsPath":null},"light":{"scheme":"file","authority":"","path":"/Users/zc/codespace/js/vscode-onetab/media/pin-dark.svg","query":"","fragment":"","_formatted":null,"_fsPath":null}}}},"blackList":[],"reverseIndex":{"/Users/zc/codespace/js/minisearch/CODE_OF_CONDUCT.md":["fb7cd278-ee69-4088-8e32-51af3ca3fc34"],"/Users/zc/codespace/js/minisearch/package.json":["fb7cd278-ee69-4088-8e32-51af3ca3fc34"],"/Users/zc/codespace/js/minisearch/tsconfig.json":["fb7cd278-ee69-4088-8e32-51af3ca3fc34"],"/Users/zc/codespace/js/minisearch/MiniSearch.svg":["fb7cd278-ee69-4088-8e32-51af3ca3fc34"],"/Users/zc/codespace/js/minisearch/yarn.lock":["fb7cd278-ee69-4088-8e32-51af3ca3fc34"]}}`

interface IconPath {
	id: string
}

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('', () => {

		let tabsState = plainToClass(TabsState, JSON.parse(testJson));

		for (const [gropuId, group] of tabsState.groups.entries()) {
			console.log(gropuId);

			for (const tab of group.tabs) {
				console.log(tab.label, tab.iconPath);
				assert(tab.iconPath instanceof vscode.ThemeIcon === false);
			}
		}
	});
});

