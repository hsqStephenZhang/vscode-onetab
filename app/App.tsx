// Copyright (c) 2022 hsqStephenZhang
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Button } from '@arco-design/web-react';
import { Message } from "../src/view/message";

import * as React from 'react';

interface AppProps {
    vscode: any
}

export const APP = (props: AppProps) => {

    const handleMessageFromExtension = React.useCallback(
        (event: MessageEvent<Message>) => {
            const message = event.data;
            console.log("message from extension:", message);
        }, []);

    React.useEffect(() => {
        window.addEventListener('message', (event) => {
            handleMessageFromExtension(event);
        });
        return () => {
            window.removeEventListener('message', handleMessageFromExtension);
        };
    });

    const handleClick = () => {
        props.vscode.postMessage({
            type: 'ping',
            text: 'hello from react'
        }, '*');
    };

    return <div>
        <h1>Advanced page for vscode-onetab</h1>
        <h2>todo:</h2>
        <li>advanced search page by tags or label name</li>
        <Button onClick={handleClick}>test ping pong</Button>
    </div>;
};