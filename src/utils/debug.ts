// Copyright (c) 2022 hsqStephenZhang
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Global } from "../common/global";
import { WorkState } from "../common/state";

export function listAllKeys() {
    const keys = WorkState.keys();
    Global.logger.debug(`${keys}`);
    for (const key of keys) {
        const obj = WorkState.get(key, undefined);
        Global.logger.debug(`${key} is: ${JSON.stringify(obj)}`);
    }
}
