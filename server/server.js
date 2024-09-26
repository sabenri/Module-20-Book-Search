import express from 'express';
import path from 'path';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware} from '@apollo/server/express4';
import { typeDefs} from './schemas/typeDefs.js';
import { resolvers } from './schemas/resolvers.js';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.urlencoded({ extended: true}));
app.use(express.json());

const secret = process.env.JWT_SECRET || 'mysecret';

const authenticate = (req) => {
  const token = req.headers.authorization || '';
  if (token) {
    try {
      const user = jwt.verify(token.split('')[1], secret);
      return { user };
    } catch (err) {
      console.log('Token Verification Error');
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