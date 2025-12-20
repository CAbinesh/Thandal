import mongoose from "mongoose";

const TransactionSchema=new mongoose.Schema({
    userId:{type:Number,ref:"User",required:true},
    takenAmnt:{type:Number,required:true},
    cltnAmnt:{type:Number,required:true},
    datee:{type:Date,required:true},
    createdAt:{type:Date,default:Date.now}
})
export default mongoose.model("transactions",TransactionSchema)