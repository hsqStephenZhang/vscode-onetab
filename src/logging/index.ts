/* eslint-disable @typescript-eslint/naming-convention */
// Copyright (c) 2022 hsqStephenZhang
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import * as vscode from "vscode";
import moment from 'moment';

export enum LogLevel {
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
}

export interface Logger {
    logLevel: LogLevel;
    setLevel(level: LogLevel): void;
    info(message?: any, ...optionalParams: any[]): void;
    debug(message?: any, ...optionalParams: any[]): void;
    warn(message?: any, ...optionalParams: any[]): void;
    error(message?: any, ...optionalParams: any[]): void;
}

export class OutputChannelLogger implements Logger {
    logLevel: LogLevel;
    outputChannel: vscode.OutputChannel;

    constructor(logLevel: LogLevel, outputChannel: vscode.OutputChannel) {
        this.logLevel = logLevel;
        this.outputChannel = outputChannel;
    }

    setLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    info(message?: any, ...optionalParams: any[]): void {
        if (this.logLevel <= LogLevel.INFO) {
            this.outputChannel.appendLine(format("INFO", message, optionalParams));
        }
    }

    debug(message?: any, ...optionalParams: any[]): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            this.outputChannel.appendLine(format("DEBUG", message, optionalParams));
        }
    }

    warn(message?: any, ...optionalParams: any[]): void {
        if (this.logLevel <= LogLevel.WARN) {
            this.outputChannel.appendLine(format("WARN", message, optionalParams));
        }
    }

    error(message?: any, ...optionalParams: any[]): void {
        if (this.logLevel <= LogLevel.ERROR) {
            this.outputChannel.appendLine(format("ERROR", message, optionalParams));
        }
    }
}

function DateFormat(date: Date) {
    return (moment(date)).format('DD-MMM-YYYY HH:mm:ss');
}

function format(level: string, message?: any, ...optionalParams: any[]) {
    if (optionalParams.length > 0) {
        return `[${DateFormat(new Date())}][${level}]: ${message}, ${optionalParams}`;
    } else {
        return `[${DateFormat(new Date())}][${level}]: ${message}`;
    }
}