// Copyright (c) 2022 hsqStephenZhang
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from 'vscode';
import * as assert from 'assert';
import { plainToClass, classToPlain, instanceToPlain, plainToInstance, Type, Transform } from "class-transformer";
import 'reflect-metadata';
import { replacer, reviver } from '../../utils/serialize';


class Todo {

	public value: number = 0;

	test1(): string {
		return `t1, number is:${this.value}`;
	}

	test2(): string {
		return `t2, number is:${this.value}`;
	}
}

class Todos {
	public children: Map<string, Todo> = new Map();
	public unique: Set<string> = new Set();

	test1() {

	}
}

class MyObject {
	@Transform(value => {
		let map = new Map<string, Todo>();
		for (let entry of Object.entries(value.value)) { map.set(entry[0], plainToClass(Todo, entry[1])); }
		return map;
	}, { toClassOnly: true })
	todoMap: Map<string, Todo> = new Map();

	@Transform(value => {
		let map = new Map<string, string[]>();
		for (let entry of Object.entries(value.value)) { map.set(entry[0], plainToClass(Array<string>, entry[1])); }
		return map;
	}, { toClassOnly: true })
	otherMap: Map<string, string[]> = new Map();

	@Transform(value => {
		let set = new Set<string>();
		for (let entry of Object.entries(value.value)) { set.add(entry[0]); }
		return set;
	}, { toClassOnly: true })
	otherSet: Set<string> = new Set();
}

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

	test('Sample serializer', () => {

		let t = new Todo();
		let todos = new Todos();
		todos.children.set('t1', t);
		todos.unique = new Set(['a', 'b']);

		let s = JSON.stringify(todos, replacer);
		let r: Todos = JSON.parse(s, reviver);
		assert.equal(Array.from(r.children.entries()).length, 1);
		assert.equal(r.unique.has('a'), true);
		assert.equal(r.unique.has('b'), true);
		assert.equal(r.unique.has('c'), false);
		for (const [_k, v] of r.children.entries()) {
			Object.setPrototypeOf(v, Todo.prototype);
		}
		let c = r.children.get('t1');
		if (c !== undefined) {
			assert.equal(c.test1(), 't1, number is:0');
		}
	});

	test('Sample class-transformer', () => {
		let t = new Todo();
		let todos = new MyObject();
		todos.todoMap.set('t1', t);
		todos.otherMap.set('t1', ['a', 'b']);
		todos.otherSet.add('a');
		todos.otherSet.add('b');

		let s = instanceToPlain(todos);
		let r: MyObject = plainToInstance(MyObject, s);
		assert.equal(Array.from(r.todoMap.entries()).length, 1);
		let other = r.otherMap.get('t1');
		assert.equal(other !== undefined && other instanceof Array && other.length === 2, true);

		assert.equal(Array.from(r.otherSet.entries()).length, 2);
		assert.equal(r.otherSet instanceof Set<string>, true);
	});
});

