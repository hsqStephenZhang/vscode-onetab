// Copyright (c) 2022 hsqStephenZhang
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Global } from "../common/global";
import { WorkState } from "../common/state";
import { STORAGE_KEY } from "../constant";
import { TabsState } from "../model/main/tabstate";

export function getStateFromStorage(): TabsState {
    const defaultState = new TabsState();
    const s = WorkState.get(STORAGE_KEY, defaultState.toString());
    const state = TabsState.fromString(s);
    return state;
}

export function currentState(): TabsState {
    const state = Global.tabsState;
    return state;
}

export function clone(origin: Object): Object {
    let originProto = Object.getPrototypeOf(origin);
    return Object.assign(Object.create(originProto), origin);
}
