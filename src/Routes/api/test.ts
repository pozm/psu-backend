import * as Express from "express";
import {encode} from "querystring";

const Route = Express.Router()

const r = Route.route(`/${encodeURI('🗿🛐').repeat(5)}/`)

r.get((req,res)=>{
	res.sendStatus(200)
})

export default Route;
