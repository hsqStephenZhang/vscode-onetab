// Copyright (c) 2022 hsqStephenZhang
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from 'vscode';
import * as assert from 'assert';
import { plainToClass, instanceToPlain, plainToInstance, Type, Transform, Expose } from "class-transformer";
import 'reflect-metadata';

class Item {

	public demo() {

	}
}

class T {}

class Todo {
	
	@Type(()=>T)
	public inner: T | undefined;

	public value: number = 0;

	@Type(() => Item)
	public items: Item[] = [];

	test1(): string {
		return `t1, number is:${this.value}`;
	}

	test2(): string {
		return `t2, number is:${this.value}`;
	}
}

class Todos {
	@Transform(value => {
		let map = new Map<string, Todo>();
		for (let entry of Object.entries(value.value)) { map.set(entry[0], plainToClass(Todo, entry[1])); }
		return map;
	}, { toClassOnly: true })
	public children: Map<string, Todo> = new Map();
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

	test('Sample class-transformer0', ()=>{
		let todo = new Todo();
		todo.inner = new T();

		let plain=instanceToPlain(todo);
		let r = plainToInstance(Todo, plain);
		assert.equal(r.inner instanceof T, true);
	});

	test('Sample class-transformer1', () => {

		let t = new Todo();
		t.items.push(new Item());
		t.items.push(new Item());
		let todos = new Todos();
		todos.children.set("a", t);

		let plain = instanceToPlain(todos);
		let r = plainToInstance(Todos, plain);
		let children = r.children.get("a");

		assert.equal(children instanceof Todo, true);
		assert.equal(children instanceof Todo && children.items[0] instanceof Item, true);
	});

	test('Sample class-transformer2', () => {
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

