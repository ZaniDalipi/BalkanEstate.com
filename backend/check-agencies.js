const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan_estate')
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    const Agency = mongoose.model('Agency', new mongoose.Schema({}, { strict: false }));
    const agencies = await Agency.find({}).select('name invitationCode city country').limit(5);

    console.log('📋 Agencies with invitation codes:');
    agencies.forEach((ag, i) => {
      console.log(`${i + 1}. ${ag.name} - Code: ${ag.invitationCode || 'NO CODE'} (${ag.city}, ${ag.country})`);
    });

    if (agencies.length === 0) {
      console.log('❌ No agencies found in database');
      console.log('ℹ️  Run: npm run seed:agencies');
    } else {
      console.log('\n✅ Test the join flow with any of the codes above');
    }

    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
