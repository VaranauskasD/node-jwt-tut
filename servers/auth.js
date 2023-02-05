require('dotenv').config()

const express = require('express')
const app = express()
const bcrypt = require('bcrypt')

const jwt = require('jsonwebtoken')

app.use(express.json())

let refreshTokens = []

const mockUsers = []

const mockPosts = [{
  username: "John Doe",
  title: "John's Post",
}, {
  username: "Tim Lee",
  title: "Tims's Post",
}]

app.get('/users', (req, res) => {
  res.json(mockUsers)
})

app.post('/users', async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10)

    const user = {
      username: req.body.username,
      password: hash
    }
    mockUsers.push(user)
    res.status(201).send()
  } catch {
    req.status(500).send()
  }

})


app.post('/users/login', async (req, res) => {
  const username = req.body.username
  const user = { username: username }
  console.log(user)
  const accessToken = generateAccessToken(user)
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
  refreshTokens.push(refreshToken)
  res.json({ accessToken: accessToken, refreshToken: refreshToken })
})

const authenticateToken = (req, res, next) => {
  const authHead = req.headers['authorization']
  const token = authHead && authHead.split(' ')[1] // get bearer token
  console.log(token)
  if (!token) {
    return res.sendStatus(401)
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    console.log(user)
    req.user = user
    next()
  })
}

app.get('/posts', authenticateToken, (req, res) => {
  console.log(req.user)
  const post = mockPosts.filter(post => {
    console.log(post)
    return post.username === req.user.username
  })
  console.log(post)
  res.json(post)
})


// app.post('/login', (req, res) => {
// })

const generateAccessToken = (user) => {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '20s' })
}

app.post('/token', (req, res) => {
  const refreshToken = req.body.token
  if (!refreshToken) {
    return res.sendStatus(401)
  }

  if (!refreshTokens.includes(refreshToken)) {
    return res.sendStatus(403)
  }

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    const accessToken = generateAccessToken({ username: user.username })
    res.json({ accessToken: accessToken })
  })
})

app.delete('/logout', (req, res) => {
  refreshTokens = refreshTokens.filter(token => token != req.body.token)
  res.sendStatus(204)
})

app.listen(4001)