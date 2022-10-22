// Copyright (c) 2022 hsqStephenZhang
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample json', () => {

		let m = new Map();
		m.set("a", 1);
		m.set("b", 2);

		assert.strictEqual(JSON.stringify(m), '{}');
		assert.strictEqual(JSON.stringify(Array.from(m.entries())), '[["a",1],["b",2]]');

		let s = '[["a",1],["b",2]]';
		let m2 = new Map(JSON.parse(s));
		assert.equal(m2.get('a'), 1);
		assert.equal(m2.get('b'), 2);
	});
});