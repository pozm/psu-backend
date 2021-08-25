import * as Express from "express";

const Route = Express.Router()

Route.post('/Register',(req,res)=>{
	res.json({})
})
Route.get('/',(req,res)=>{
	res.json({data:[]})
})

export default Route;
