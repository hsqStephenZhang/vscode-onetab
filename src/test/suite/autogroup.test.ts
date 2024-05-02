// Copyright (c) 2022 hsqStephenZhang
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { requestAutoGroup } from '../../autogroup';
import { assert } from 'console';

suite('Extension Test Suite', () => {
    test('auto group test', async () => {
        let files = ["cmd/hello.rs", "utils/hi/hello.go", "utils/mod.rs", "cmd/world.go"];
        let apiKey = process.env["ANTHROPIC_API_KEY"];
        if (apiKey === undefined) {
            return;
        }

        let groups = await requestAutoGroup(apiKey, ["ext"], files);
        assert(groups !== undefined);
        assert(groups?.keys.length === 2); // rs, go

        let groups2 = await requestAutoGroup(apiKey, ["name"], files);
        assert(groups2 !== undefined);
        assert(groups2?.keys.length === 3); // hello, mod, world

        let groups3 = await requestAutoGroup(apiKey, ["dir"], files);
        assert(groups3 !== undefined);
        assert(groups3?.keys.length === 2); // cmd, utils

    }).timeout(20000);
});

