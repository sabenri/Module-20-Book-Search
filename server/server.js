const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const cors = require('cros');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { typeDefs, resolvers } = require('./schemas');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.urlencoded({ extended: true}));
app.use(express.json());
app.use(helmet());
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

const secret = process.env.JWT_SECRET || 'mysecret';

const authenticate = (req) => {
  const token = req.headers.authorization || '';
  if (token) {
    try {
      const user = jwt.verify(token.split('')[1], secret);
      return { user };
    } catch (err) {
      console.error('Token Verification Error:', err.message);
    }
  }
  return {};
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/BookSearchDB',{
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const shutdown = () => {
  mongoose.connections.close(() => {
    console.log('MongoDB Connection Closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const startApolloServer = async () => {
  const server = new ApolloServer ({
    typeDefs,
    resolvers,
    context: ({req}) => {
      const auth = authenticate(req);
      return {...auth };
    },
  });

  await server.start();

  app.use ('/graphql', expressMiddleware(server));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));

    app.get('*',(req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
  };
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('Api Server Running On Port ${PORT}!');
  console.log('Use GraphQL at http://localhost:${PORT}/graphql');
});

startApolloServer();