import * as Express from 'express';

import Bodyparser from "body-parser";
const Route = Express.Router()

Route.use(Bodyparser.json({
	limit: '10kb',
	strict: true,
}), Bodyparser.urlencoded({
	limit: '3kb',
	parameterLimit: 4,
	extended: true
}))


// testing and error handling
Route.get("/", (_: Express.Request, res : Express.Response) => {
	res.send("ok skid")
})


export default Route;
