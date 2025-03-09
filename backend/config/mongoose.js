const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://mern:mern@cluster0.6mdyfjt.mongodb.net/',
// mongoose.connect('mongodb://127.0.0.1:27017/PIMSdb', 
{


});


mongoose.connection.once('open', async () => {
  try {

    const collections = await mongoose.connection.db.listCollections().toArray();
    const patientsCollectionExists = collections.some(col => col.name === 'patients');

    if (patientsCollectionExists) {
      const patientsCollection = mongoose.connection.db.collection('patients');
      const patientIndexes = await patientsCollection.indexes();
      const patientIndexExists = patientIndexes.some(index => index.name === 'patient_email_1');

      if (patientIndexExists) {
        console.log('Index "patient_email_1" found. Dropping the existing index...');
        await patientsCollection.dropIndex('patient_email_1');
        console.log('Index "patient_email_1" dropped.');
      } else {
        console.log('Index "patient_email_1" not found. Skipping drop index.');
      }

      await patientsCollection.createIndex({ patient_email: 1 }, { unique: true, sparse: true });
      console.log('New index "patient_email_1" created.');
    } else {
      console.log('Patients collection does not exist. Cannot create or drop indexes.');
    }

    const appointmentsCollectionExists = collections.some(col => col.name === 'appointments');

    if (appointmentsCollectionExists) {
      const appointmentsCollection = mongoose.connection.db.collection('appointments');
      const appointmentIndexes = await appointmentsCollection.indexes();
      const appointmentIndexExists = appointmentIndexes.some(index => index.name === 'appointment_ID_1');

      if (appointmentIndexExists) {
        console.log('Index "appointment_ID_1" found. Dropping the existing index...');
        await appointmentsCollection.dropIndex('appointment_ID_1');
        console.log('Index "appointment_ID_1" dropped.');
      } else {
        console.log('Index "appointment_ID_1" not found. Skipping drop index.');
      }
    } else {
      console.log('Appointments collection does not exist. Cannot create or drop indexes.');
    }
  } catch (error) {
    console.error('Error handling indexes:', error);
  }
});

