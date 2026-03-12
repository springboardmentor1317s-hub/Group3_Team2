const Registration = require('../models/Registration');

exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updatedRegistration = await Registration.findByIdAndUpdate(
      id,
      { status: status },
      { new: true }
    ).populate('user_id', 'fullName email college');

    if (!updatedRegistration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    res.status(200).json({ 
      message: `Registration ${status}`, 
      registration: updatedRegistration 
    });

  } catch (error) {
    console.error('Error updating registration status:', error);
    res.status(500).json({ message: 'Server error updating registration status' });
  }
};
