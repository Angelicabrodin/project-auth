import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcrypt-nodejs'


const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/authAPI"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const User = mongoose.model('User', {
  username: {
    type: String,
    unique: true,
    minlength: 2,
    maxlength: 25
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})

const port = process.env.PORT || 9000
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ accessToken: req.header('Authorization') })
    if (user) {
      req.user = user
      next()
    } else {
      res.status(401).json({ loggedOut: true, message: "Please try logging in again" })
    }
  } catch (err) {
    res.status(403).json({ message: 'Access token is missing or wrong', error: err.errors })
  }
}
// Create user

app.post('/users', async (req, res) => {
  try {
    const { username, password } = req.body
    const user = new User({ username, password: bcrypt.hashSync(password) })
    user.save()
    res.status(201).json({ id: user._id, accessToken: user.accessToken })
    console.log(json)
  } catch (err) {
    res.status(400).json({ message: "Could not create user", errors: err.errors })
  }
})

app.get('/secrets', authenticateUser)
app.get('/secrets', (req, res) => {
  res.json({
    secret: 'This is a super secret message.',
    user: req.user.username
  })
})

// login user

app.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username })
    if (user && bcrypt.compareSync(req.body.password, user.password)) {
      // Success
      res.status(201).json({ userId: user._id, accessToken: user.accessToken })
      // Failure
    } else {
      res.status(404).json({ notFound: true, message: 'username or password incorrect' })
    }
  } catch (err) {
    res.status(400).json({ message: 'could not find user', errors: err.errors })
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})