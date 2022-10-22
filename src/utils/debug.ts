// Copyright (c) 2022 hsqStephenZhang
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Global } from "../common/global";
import { WorkState } from "../common/state";

export function debugState() {
    const keys = WorkState.keys();
    Global.logger.info(`${keys}`);
    for (const key of keys) {
        const obj = WorkState.get(key, undefined);
        Global.logger.info(`${key} : ${JSON.stringify(obj)}`);
    }
}

export function clearState() {
    const keys = WorkState.keys();
    for (const key of keys) {
        WorkState.update(key, undefined);
    }
}