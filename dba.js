const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const User = new Schema({
    name : String,
    email : {type : String,unique : true},
    password : String,
    points : {type : Number,default : 0 }

})

const Todo = new Schema({
    todo : String,
    description : String,
    userId : ObjectId,
    done : Boolean,
    time : {type : Date,default : Date.now()},
    priority : String
})

const UserModel= mongoose.model('users',User);
const TodoModel = mongoose.model('todos',Todo);
module.exports = {
    UserModel : UserModel,
    TodoModel : TodoModel
}