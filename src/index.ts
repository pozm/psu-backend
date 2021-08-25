import express, {Express, Router} from "express"
import { PrismaClient } from '@prisma/client'
import expressSession from 'express-session'
import { PrismaSessionStore } from '@quixo3/prisma-session-store'
import { IPrisma } from "@quixo3/prisma-session-store/dist/@types";
import {readdirSync, readFileSync, statSync} from "fs";
import {join} from 'path'
import VM from 'vm'
import {createRequire} from 'module'
import {Logger} from "./Utils/Logger";
import chalk from "chalk";

const app = express();

const prisma = new PrismaClient()

// express session used to keep sessions of users so they don't have to login again.

app.use(
    expressSession({
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000 // ms
        },
        saveUninitialized:true,
        resave:false,
        secret: 'H4sIAAAAAAAAAE2KsQ3AIADDbkKAQ85pK/H/CQRYOtmJjHnUgUFR5aUxwvKzL+402XGn6zJNumTu79SblpgLzlUAcFYAAAA=',
        store: new PrismaSessionStore(
            prisma as unknown as IPrisma,
            {
                checkPeriod: 2 * 60 * 1000, // ms
                dbRecordIdIsSessionId: true,
                dbRecordIdFunction: undefined,
            }
        )
    })
);
// [ lazy ]
__dirname = join(__dirname,'Routes');

// Length of dir
const dirLength = __dirname.split('/').length

const oldConsole = {...console};
export const oldConsoleRef = new WeakRef(oldConsole);

let Mounter : express.Application | Router = app;

async function MountDir(path:string) {
    let PathSplit = path.split('/');
    let relPathOffset = PathSplit.length - dirLength;
    let relPath       = "/"+PathSplit.slice(-1).join('/')
    for (let file of readdirSync(path)) {
        let xpath     =  join(path,file);
        let stat      =  statSync(xpath)
        if (stat.isDirectory()) {
            // let it run asynchronously
            MountDir(xpath)
        } else {
            if (!file.endsWith('.js'))
                continue;
            if (relPathOffset == 0 && file=="index.js")
                continue;
            try {
                let f = require(xpath);
                let buildRel = file == 'index.js' ? `${relPath}/` : '/'+ file.slice(0,-3)
                console.log(`> Mapped routes from ${buildRel}\t<`)
                Mounter.use(buildRel,f.default)
                if (file == 'index.js') {
                    Mounter = f.default;
                }
            } catch {


                // unable to require // prob err.
                // -- we can find out that error at runtime by making a vm.

                // make fake require func.
                let fakeReq = createRequire(xpath)

                // make our fake context..
                let ctx = VM.createContext({require:fakeReq,console: {log:()=>{}},exports, setInterval,clearInterval ,process})

                // create the script to run

                let script = new VM.Script(readFileSync(xpath).toString(),{
                    filename:file,
                    timeout:2e3
                })

                // attempt to run the script
                try {

                    script.runInContext(ctx,{
                        filename:file,
                        timeout:2e3,
                        displayErrors:true,
                    })

                    console.log(`${file} was unable to be imported; but still ran fine under vm`)

                } catch (e) {

                    console.log(`${e}`)

                }
            }
        }
    }
}


// connect 2 prisma & export
prisma.$connect()

export { prisma };


// running as main ctx
if (require.main == module) {
    // allow top level await
    (async()=>{
        // wait for all directories to be mounted
        await MountDir(__dirname)

        console.log('\n      > Imported Routes <\n')
        // i recommend to collapse this block.
        {
            function split (thing : any) {
                if (typeof thing === 'string') {
                    return thing.split('/')
                } else if (thing.fast_slash) {
                    return ''
                } else {
                    let match = thing.toString()
                        .replace('\\/?', '')
                        .replace('(?=\\/|$)', '$')
                        .match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//)
                    return match
                        ? match[1].replace(/\\(.)/g, '$1').split('/')
                        : '<complex:' + thing.toString() + '>'
                }
            }

            function print (path: any, layer : any) {
                if (layer.route) {
                    layer.route.stack.forEach(print.bind(null, path.concat(split(layer.route.path))))
                } else if (layer.name === 'router' && layer.handle.stack) {
                    layer.handle.stack.forEach(print.bind(null, path.concat(split(layer.regexp))))
                } else if (layer.method) {
                    let c = '#9775DD'
                    let method = layer.method.toUpperCase()
                    switch (method) {
                        case 'GET' : break;
                        case 'PUT' : c = '#D19A66'; break;
                        case 'POST': c = '#40806E'; break;
                        case 'PATCH': c = '#D2A15C'; break;
                        case 'DELETE': c = '#E06C75'; break;
                        case 'HEAD': c = '#418EB5'; break;
                        case 'OPTIONS': c = '#418EB5'; break;
                    }
                    Logger.TLog(method,chalk.bgHex(c).black,`/${path.concat(split(layer.regexp)).filter(Boolean).join('/')}\n`)
                    // process.stdout.write(`${chalk.bgHex(c).black(method)}\t/${path.concat(split(layer.regexp)).filter(Boolean).join('/')}\n`)

                }
            }

            app._router.stack.forEach(print.bind(null, []))
        }

        console.log('\n')

        console.log = Logger.Log.bind(this,undefined)

        // we should probably change this when not in dev env

        const port = 42547;


        //@todo(pozm) we should probably listen on 0.0.0.0 on production, but right now we shouldn't worry.
        app.listen(port,()=>{
            Logger.TLog('READY',chalk.bgGreenBright.black,`Listening to localhost:${port}.\n`)
        })
    })();
}
