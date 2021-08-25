// utils for command line appearance


import chalk from "chalk";
import {oldConsoleRef} from "../index";


export function Clamp(num : number,min : number,max : number) {
    return Math.min(Math.max(num, min), max);
}
function fillText(t : string) {
    let size = process.stdout.columns
    return t + ' '.repeat(Clamp(0,size-t.length,Number.MAX_SAFE_INTEGER))
}

class LoggerClass {
    public Custom : {[x:string]:(...s : any[])=>void}
    private Store : {[ID:string]:number}
    constructor() {
        this.Custom = {}
        this.Store = {}
    }
    Log(t : string= "LOG" ,...s : any[]) {
        let oldConsoleLog = oldConsoleRef.deref()
        if (!oldConsoleLog)
            return
        oldConsoleLog.log(`[${chalk.greenBright(t)}] >`,...s)
    }
    CLog(t : string= "LOG", c:chalk.Chalk ,...s : string[]) {
        process.stdout.write(`[${c(t)}] > ${s.join(', ')}`)
    }
    TLog(t : string="LOG",c:chalk.Chalk, ...s : string[]) {
        // lol same
        process.stdout.write(`${c(t)}\t${s.join(', ')}`)
    }

}

export const Logger = new LoggerClass()
