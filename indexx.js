const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://21cs2014:PjqThuLa8aIQYfhg@cluster0.x4o0n.mongodb.net/todo-collections-new');
const{UserModel,TodoModel} = require("./dba");
const app = express();
app.use(express.json());
const JWT_SECRET = 'dhbvdsvkasdjans';
const { z } = require('zod');
const rateLimit = require('express-rate-limit')
const apiLimiter = rateLimit({
    windowMs : 15 * 60 * 1000,
    max : 100,
    message : 'Too many requests'
});
app.use(apiLimiter);
app.get('/',function(req,res){
    res.sendFile("/Users/priyanshudeswal/Desktop/dbbackend/public/index.html")
});
app.get('/dashboard.html',auth,function(req,res){
    res.sendFile("/Users/priyanshudeswal/Desktop/dbbackend/public/dashboard.html");
})


app.post('/signup',async function(req,res){
    const reqBody = z.object({
        name : z.string().min(3).max(100),
        email : z.string().min(3).max(100).email(),
        password : z.string().min(3).max(10).regex(/[A-Z]/,"Password must contain atleast one uppercase").regex(/[\W_]/,"Password must contain one symbol!")
    })
    const parsedDataWithSuccess = reqBody.safeParse(req.body);
    if(!parsedDataWithSuccess.success){
        res.status(404).json({
            message : "Incorrect format",
            error : parsedDataWithSuccess.error
        })
        return
    }



    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    let errorThrown = false;
    try{
        const hashedPassword = await bcrypt.hash(password,5);
        await UserModel.create({
        name : name,
        email : email,
        password : hashedPassword
        


        })
    }
    catch(err){
        res.status(403).json({
            message : 'user already exists!'
        })
        errorThrown = true;

    }
    if(!errorThrown){
        res.status(200).json({
            message : 'you are signed up'
        })
    }
})
app.post('/signin',async function(req,res){
    const email = req.body.email;
    const password = req.body.password;

    const response = await UserModel.findOne({
        email : email
    })
    if(!response){
        res.status(403).json({
            message : "user does not exist"
        })
    }

    const passwordMatch =  bcrypt.compare(password,response.password);
    if(passwordMatch){
        const token = jwt.sign({
            id : response._id.toString()
        },JWT_SECRET);
        res.status(200).json({
            token : token
        })
    }
    else{
        res.status(404).json({
            message : 'incorrect password'
        })
    }
})
app.post('/addtodo',auth,function(req,res){
    const userId = req.userId;
    const todo = req.body.todo;
    const done = req.body.done;
    const description = req.body.description;
    TodoModel.create({
        todo : todo,
        description : description,
        done : done,
        userId : userId,
        priority : 'low'
    })
    res.status(200).json({
        message : "todo added"
    })

})
app.get('/todos', auth, async function(req, res) {
    const userId = req.userId;
    const { page =1,limit =5 } = req.query;
    try {
        const todos = await TodoModel.find({
            userId: userId
        }).skip((page-1)*limit).limit(Number(limit));
        res.status(200).json({
            tasks: todos
        });
    } catch (error) {
        res.status(400).json({
            message: "Error fetching todos"
        });
    }
});



function auth(req,res,next){
    const token = req.headers.token;
    const decInfo = jwt.verify(token,JWT_SECRET);
    if(decInfo){
        req.userId = decInfo.id;
        next();
    }
    else{
        res.status(403).json({
            message : "authentication failed!"
        })
    }

}

app.post('/done',auth,async function(req,res){
    const userId = req.userId;
    const todo = req.body.todo;
    try{
        const response = await TodoModel.findOneAndUpdate({
            userId : userId,
            todo : todo
        },{done:true},{new:true});
        if(response){
            res.status(200).json({
                message : "todo updated",
                todo : response
            })

        }
        else{
            res.status(400).json({
                message : "todo not found"
            })
        }
    }
    catch(err){
        res.status(400).json({
            message: "error"
        })
    }

})
app.post('/delete',auth,async function(req,res){
    const userId = req.userId;
    const todo = req.body.todo;
    try{
        const response = await TodoModel.findByIdAndDelete({
            userId :userId,
            todo : todo
        })
        if(response){
            res.status(200).json({
                message : "todo deleted"
            })
        }
        else{
            res.status(404).json({
                message : "todo not found"
            })
        }
    }
    catch(err){
        res.status(400).json({
            message: "error accessing the database"
        })

    }
})
app.post('/reset',auth,async function(req,res){
    const email = req.body.email;
    const password = req.body.password;
    const zodObject = z.object({
        newPassword : z.string().min(3).max(10).regex(/[A-Z]/,"Password must contain atleast one uppercase").regex(/[\W_]/,"Password must contain one symbol!")
    })
    const ver = zodObject.safeParse(req.body.newPassword)
    const newPassword = req.body.newPassword;
    if(!ver.success){
        res.status(404).json({
            message : "incorrect format",
            error : ver.error
        })
    }
    try{
        const response = await UserModel.findOne({
            email : email
        });
        if(response){
            const hashedP = response.password;
            const verify = await bcrypt.compare(password,hashedP);
            if(verify){
                const hashednew = await bcrypt.hash(newPassword,5);
                const response2 = await UserModel.findOneAndUpdate({
                    email : email
                    

                },{password : hashednew})
            }
            res.status(200).json({
                message : "password updated"
            })

        }
        else{
            res.status(400).json({
                message : "incoorect password"
            })
        }

    }
    catch(err){
        res.status(400).json({
            message : "unable to acces database"
            
        })
    }

})
app.get('/productivity',auth,async function(req,res){
    const userId = req.userId;
    try{
        const notDone = await TodoModel.countDocuments({
            userId : userId,
            done : false
    
        });
    
        const Alltodo = await TodoModel.countDocuments({
            userId : userId
        });
    
        const productivity = ((Alltodo-notDone)/Alltodo) * 100 ;
        if(productivity>80 && productivity<100){
            res.json({
                message : "You are going good today",
                todayPro : productivity
            })
        }
        if(productivity>60 && productivity<80){
            res.json({
                message : "You need to push a lil bit!",
                todayPro : productivity
            })
        }
        if(productivity>0 && productivity<60){
            res.json({
                message : "You are lacking behind!Keep going",
                todayPro : productivity
            })
        }

    }
    catch(err){
        res.status(500).json({
            message : "Trouble connecting with DB"
        })
    }




})
app.get('/pending',auth, async function(req,res){

    const userId = req.userId;

    const timeN = new Date(Date.now() - 12*60*60*1000);

    try{
        const overdueTasks = await TodoModel.find({
            userId : userId,
            done : false,
            time : { $lt : timeN}
    
        })
        if(overdueTasks){
            res.json({
                tasks : overdueTasks
            })
        }
        else{
            res.json({
                message : "no tasks is pending from more than 12 hours!"
            })
        }
    }



    catch(err){
        res.status(500).json({
            message : "unable to access the db"
        })

    }

})
app.get('/todos/search',auth,async function(req,res){
    const userId = req.userId;
    const query = req.query;
    try{
        const responsee = await TodoModel.find({
            userId : userId,
            $or : [
                {description : {$regex : query,$options : 'i'}},
                {todo : {$regex : query,$options : 'i'}}
            ]
    
        });
        res.json({
            tasks : responsee
        })
    }
    catch(err){
        res.status(500).json({
            message : "unable to access db"
        })

    }
})
app.post('/priority',auth,async function(req,res){
    const userId = req.userId;
    const todo = req.body.todo;
    try{
        const responses = await TodoModel.findOneAndUpdate({
            userId : userId,
            todo : todo
        },{priority : 'high'},{new : true})
        if(responses){
            res.json({
                message : "priority increased",
                todo : responses
            })
        }
        else{
            res.json({
                message : "todo not found"
            })
        }
    }
    catch(err){
        res.status(500).json({
            message : "unable to access the database"
        })
    }

});
app.get('/points',auth,async function(req,res){
    const userId = req.userId;
    try{
        const doneTasks = await TodoModel.countDocuments({
            userId : userId,
            done : true
        });
        let pointsVal = doneTasks*10 ;
        const ress = await UserModel.findOneAndUpdate({
            _id : userId
    
        },{points : pointsVal},{new : true});
        res.json({
            message : "points updated successfully",
            user : ress
        })
    }
    catch(err){
        res.status(500).json({
            message : "cant access database"
        })
    }
})






app.listen(3001);
 