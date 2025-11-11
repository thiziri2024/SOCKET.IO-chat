const User = require('./models/User');

async function testUsers() {
    const users = await User.find();
    console.log(users);
}

testUsers();
