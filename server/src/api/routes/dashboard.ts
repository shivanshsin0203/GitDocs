import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/me",authenticate,async(req,res)=>{
    const user=await db.select().from(users).where(eq(users.id,req.userId!))
    const response={message:"success",user:{avatar:user[0].avatar,name:user[0].name,email:user[0].email,username:user[0].username}}
    res.json(response)
})

export default router