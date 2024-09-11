import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import {z} from 'zod'
import { prismaclient } from "../../lib/db";
const UpvoteSchema = z.object({
    streamId:z.string(),

})
export async function POST(req:NextRequest) {
    const session = await getServerSession();
    

    const user = await prismaclient.user.findFirst({
        where:{
            email:session?.user?.email ?? ""
        }
    })

    if(!user)
        {
            return NextResponse.json({
                message:"Unauthorized"
            },{
                status:403
            })
    
        }
    try{
        const data  = UpvoteSchema.parse(await req.json())
        await prismaclient.upvote.delete({
            where:{
                userId_streamId:{
                    userId:user.id,
                    streamId:data.streamId
                }
            }
        })
    }catch(e)
    {
        return NextResponse.json({
            message:"Unauthorized"
        },{
            status:403
        })

    }
    
}