require("dotenv").config()

const moongose = require("mongoose")

moongose.connect(process.env.MONGO_URL)

const jwt = require("jsonwebtoken")
const { authenticationToken } = require("./utilities")

const User = require("./models/user.model")
const Note = require("./models/note.model")

const express = require("express") 
const cors = require("cors")
const app = express()
app.use(express.json())

app.use(cors({ origin: "*" }))

app.get("/", (req,res) => {
    res.json({data: "Hello! server running"})
})

app.post('/create-account', async (req,res) => {
    const { fullName, email, password } = req.body

    if(!fullName) {
        return res.status(400).json({
            error: true,
            message: "Full Name is required"
        })
    }

    if(!email) {
        return res.status(400).json({
            error: true,
            message: "Email is required"
        })
    }

    if(!password) {
        return res.status(400).json({
            error: true,
            message: "Password is required"
        })
    }

    const isUser = await User.findOne({
        email: email
    })

    if(isUser) {
        return res.json({
            error: true,
            message: "User already exist"
        })
    }

    const user = await User({
        fullName,
        email,
        password
    })

    user.save()

    const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "3600m"
    })

    return res.json({
        error: false,
        user,
        accessToken,
        message: "Registration Successful"
    })

})

app.post('/login', async ( req , res )=> {
    const { email, password } = req.body;

    if(!email) {
        return res.status(400).json({ message: "email required", error : true})
    }


    if(!password) {
        return res.status(400).json({ message: "password required", error : true})
    }

    const userInfo = await User.findOne({ email: email })

    if(!userInfo) {
        return res.status(400).json({message: "User not found", error: true})
    }

    if(userInfo.email == email && userInfo.password == password) {
        const user = { user: userInfo };
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET , { expiresIn: "3600m" })

        return res.json({
            error: false,
            message: "login successfully",
            email,
            accessToken
        })
    } else {
        return res.status(400).json({
            error: true,
            message: "Invalid Credentials",
        })
    }

    return 
})

app.get('/get-user', authenticationToken, async ( req , res )=> {
    const { user } = req.user;
    console.log(user)
    try {
        const userInfo = await User.findOne({ _id: user._id })

        if(!userInfo) {
            res.status(404).json({
                error : true,
                message: "user not found"
            })
        }

        return res.json({
            error : false,
            user : { _id: userInfo._id ,fullName: userInfo.fullName, email: userInfo.email },
            message: "user details fetched."
        })
        
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: true,
            message: "Internal server error. please try again later"
        })
    }   

})

app.post('/add-note', authenticationToken, async (req,res) => {
    const { title, content, tags } = req.body;
    const { user } = req.user;

    if(!title) {
        return res.status(400).json({ message: "title is required", error: true })
    }

    if(!content) {
        return res.status(400).json({ message: "content is required", error: true })
    }

    try {
        
        const note = new Note({
            title,
            content,
            tags: tags || [],
            userId: user._id 
        })

        await note.save()

        return res.json({
            error: false,
            note,
            message: "Note Added Successfullly"
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: true,
            message: "Internal server error. please try again later"
        })
    }

})

app.post('/edit-note/:noteId', authenticationToken, async (req,res) => {
    const noteId = req.params.noteId;
    const { title, content, tags, isPinned  } = req.body
    const { user } = req.user;

    if(!title && !content && !tags) {
        return res.status(400).json({ message: "No changes provided", error: true })
    }

    try {
        
        const note = await Note.findOne({ _id: noteId, userId: user._id })

        if(!note) {
            return res.status(400).json({
                error: true,
                message: "Note not found"
            })
        }

        if(title) note.title = title;
        if(content) note.content = content;
        if(tags) note.tags = tags;
        if(isPinned) note.isPinned = isPinned;

        await note.save()

        return res.json({
            error: false,
            note,  
            message: "Note updated Successfullly"
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: true,
            message: "Internal server error. please try again later"
        })
    }

})


app.get('/all-notes/', authenticationToken, async (req,res) => {
    const { user } = req.user;
    try {
        
        const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 })

        return res.json({
            error: false,
            notes,  
            message: "Notes fetched Successfullly"
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: true,
            message: "Internal server error. please try again later"
        })
    }

})

app.post('/delete-note/:noteId', authenticationToken, async (req,res) => {
    const noteId = req.params.noteId;
    const { user } = req.user;

    try {
        
        const note = await Note.findOne({ _id: noteId, userId: user._id })

        if(!note) {
            return res.status(404).json({
                error: true,
                message: "Note not found"
            })
        }

        await Note.deleteOne({ _id: noteId, userId: user._id });


        return res.json({
            error: false,
            message: "Note removed Successfullly"
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: true,
            message: "Internal server error. please try again later"
        })
    }

})

app.post('/update-note-pinned/:noteId', authenticationToken, async (req,res) => {
    const noteId = req.params.noteId;
    const { isPinned } = req.body
    const { user } = req.user;

    try {
        
        const note = await Note.findOne({ _id: noteId, userId: user._id })

        if(!note) {
            return res.status(400).json({
                error: true,
                message: "Note not found"
            })
        }

        if(isPinned === true || isPinned === false) note.isPinned = isPinned;

        await note.save()

        return res.json({
            error: false,
            note,  
            message: isPinned ? "Note Pinned Successfullly" : "Note Unpinned Successfully"
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: true,
            message: "Internal server error. please try again later"
        })
    }

})

app.get('/search-notes/', authenticationToken, async (req,res) => {
    const { query } = req.query
    const { user } = req.user;

    if(!query) {
        return res.status(400).json({error: true, message: "search query required"})
    }

    try {
        
        const notes = await Note.find({
            userId: user._id,
            $or : [
                {title : { $regex: new RegExp(query, "i") }},
                {content : { $regex: new RegExp(query, "i") }}
            ]    
        })

        return res.json({
            error: false,
            notes,
            message: "Notes matching retrieved successfully"
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: true,
            message: "Internal server error. please try again later"
        })
    }

})
let port = process.env.PORT || 8000
app.listen(port,() => {
    console.log('server started at 8000')
})

module.exports = app