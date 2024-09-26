const { authenticationError } = require('@apollo/server/errors');
const { User, Book } = require('../models');
const jwt = require('jsonwebtoken');
const { Query } = require('mongoose');
const { login } = require('../controllers/user-controller');

const secret = process.env.JWT_SECRET || 'mysecret';

const resolvers = {
    Query: {
        books: async () => {
            return Book.find({});
        },
        book: async (parent, { id }) => {
            return Book.findById(id);
        },

        me: async (parent, args, {user}) => {
            if (!user) {
                throw new authenticationError('Please Log In');
            }
            return User.findById(user._id).populate('saveBooks');
        },
    },

    Mutation: {
        addUser: async (parent, {username, email, password}) => {
            const user = await User.create({ username, email, password});
            const token = jwt.sign({_id: user_id, email: user.email}, secret, { expiresIn: '2h'});
            return { token, user };
        },
        
        login: async (parent, { email, password}) => {
            const user = await User.findOne ({ email });

            if (!user) {
                throw new authenticationError('Sorry, The User Was Not Found.');
            }

            const correctPw = await user.isCorrectPassword(password);

            if (!correctPw) {
                throw new authenticationError('Sorry, This Password Is Invalid.');
            }
            const token =jwt.sign({_id: user._id, email: user.email}, secret, { expiresIn: '2h'});
            return { token, user };
        },

        saveBook: asyn (parnet, { bookData }, { user }) => {
            if(!user) {
                throw new authenticationError('Please Log In To Remove Books');
            }

            return User.findByIdAndUpdate(
                user._id,
                { $pull: { saveBook: { bookId}}},
                {new: true}
            ).populate('savedBooks');
        },
    },
};

module.exports = resolvers;