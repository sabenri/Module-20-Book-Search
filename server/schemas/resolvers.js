import { ApolloError } from '@apollo/server';
import { User, Book } from '../models/index.js';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'mysecret';

const resolvers = {
    Query: {
        books: async () => {
            return Book.find({});
        },
        book: async (_parent, { id }) => {
            return Book.findById(id);
        },

        me: async (_parent, args, { user }) => {
            if (!user) {
                throw new ApolloError('Please log in.');
            }
            return User.findById(user._id).populate('savedBooks');
        },
    },

    Mutation: {
        addUser: async (_parent, { username, email, password }) => {
            const user = await User.create({ username, email, password });
            const token = jwt.sign({ _id: user._id, email: user.email }, secret, { expiresIn: '2h' });
            return { token, user };
        },
        
        login: async (_parent, { email, password }) => {
            const user = await User.findOne({ email });

            if (!user) {
                throw new ApolloError('User not found.');
            }

            const correctPw = await user.isCorrectPassword(password);

            if (!correctPw) {
                throw new ApolloError('Invalid password.');
            }

            const token = jwt.sign({ _id: user._id, email: user.email }, secret, { expiresIn: '2h' });
            return { token, user };
        },

        saveBook: async (_parent, { bookData }, { user }) => {
            if (!user) {
                throw new ApolloError('You must be logged in to save books.');
            }

            return User.findByIdAndUpdate(
                user._id,
                { $addToSet: { savedBooks: bookData } },
                { new: true, runValidators: true }
            ).populate('savedBooks');
        },

        removeBook: async (_parent, { bookId }, { user }) => {
            if (!user) {
                throw new ApolloError('You must be logged in to remove books.');
            }

            return User.findByIdAndUpdate(
                user._id,
                { $pull: { savedBooks: { bookId } } },
            ).populate('savedBooks');
        },
    },
};

export {resolvers};
