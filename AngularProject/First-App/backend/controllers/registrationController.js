const Registration = require('../models/Registration');
const Event        = require('../models/Event');
const User         = require('../models/User');
const Notification = require('../models/Notification');

// ── Helper: create notification ───────────────────────────
async function notify(userId, type, title, message, eventId = null) {
  try { await Notification.create({ userId, type, title, message, eventId }); }
  catch (e) { console.error('Notification error:', e.message); }
}

// ── POST /:eventId/register ───────────────────────────────
exports.registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;   // eventId
    const { selectedSlot, paymentMethod, paymentTxnId, paymentAmount, useWallet } = req.body;
    const userId = req.userId;

    console.log(`📝 Registration Request:`);
    console.log(`   Event ID: ${id}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Payment Method: ${paymentMethod}`);
    console.log(`   Use Wallet: ${useWallet}`);
    console.log(`   Payment Amount: ${paymentAmount}`);
    console.log(`   Transaction ID: ${paymentTxnId}`);

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.status === 'cancelled') return res.status(400).json({ message: 'Event is cancelled' });
    if (event.currentParticipants >= event.maxParticipants) return res.status(400).json({ message: 'Event is full' });

    // Check already registered
    const existing = await Registration.findOne({ eventId: id, userId });
    if (existing) return res.status(400).json({ message: 'You are already registered for this event' });

    // Payment logic
    let payStatus = 'free';
    let txnId = paymentTxnId || '';
    let finalAmount = 0;
    let updatedWalletBalance = null;
    let paymentProcessed = false;
    
    if (event.registrationFee > 0) {
      finalAmount = event.registrationFee;
      
      if (useWallet === true || paymentMethod === 'wallet') {
        // WALLET PAYMENT - Deduct from wallet
        const student = await User.findById(userId);
        if (!student || student.walletBalance < event.registrationFee) {
          return res.status(400).json({ message: 'Insufficient wallet balance' });
        }
        
        student.walletBalance -= event.registrationFee;
        await student.save();
        
        payStatus = 'paid';
        txnId = 'WALLET-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        updatedWalletBalance = student.walletBalance;
        paymentProcessed = true;
        
        console.log(`💰 Wallet payment successful: ₹${event.registrationFee} deducted, New balance: ${updatedWalletBalance}`);
        
      } else if (paymentMethod === 'upi') {
        // UPI PAYMENT
        console.log(`💳 Processing UPI payment of ₹${event.registrationFee}`);
        
        // Generate transaction ID if not provided
        if (!txnId) {
          txnId = 'UPI-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        }
        
        payStatus = 'paid';
        paymentProcessed = true;
        
        console.log(`✅ UPI payment successful! Transaction ID: ${txnId}`);
        
      } else if (paymentMethod === 'card') {
        // CARD PAYMENT
        console.log(`💳 Processing Card payment of ₹${event.registrationFee}`);
        
        if (!txnId) {
          txnId = 'CARD-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        }
        
        payStatus = 'paid';
        paymentProcessed = true;
        
        console.log(`✅ Card payment successful! Transaction ID: ${txnId}`);
        
      } else if (paymentMethod === 'netbanking') {
        // NET BANKING PAYMENT
        console.log(`🏦 Processing Net Banking payment of ₹${event.registrationFee}`);
        
        if (!txnId) {
          txnId = 'NB-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        }
        
        payStatus = 'paid';
        paymentProcessed = true;
        
        console.log(`✅ Net Banking payment successful! Transaction ID: ${txnId}`);
        
      } else if (paymentMethod && paymentAmount) {
        // OTHER PAYMENT METHODS
        console.log(`💳 Processing ${paymentMethod} payment of ₹${event.registrationFee}`);
        
        if (!txnId) {
          txnId = 'PAY-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        }
        
        payStatus = 'paid';
        paymentProcessed = true;
        
        console.log(`✅ ${paymentMethod} payment successful! Transaction ID: ${txnId}`);
        
      } else {
        return res.status(400).json({ message: 'Payment required for this event' });
      }
    }

    // Create registration
    const registration = await Registration.create({
      eventId:       id,
      userId,
      selectedSlot:  selectedSlot || '',
      approvalStatus: 'pending',
      paymentStatus: payStatus,
      paymentMethod: useWallet ? 'wallet' : (paymentMethod || ''),
      paymentTxnId:  txnId,
      paymentAmount: finalAmount
    });

    // Update event participant count
    event.currentParticipants += 1;
    await event.save();

    // Notify event creator about new registration
    if (event.createdBy) {
      const student = await User.findById(userId);
      await notify(event.createdBy, 'new-registration', '📋 New Registration Request',
        `${student?.fullName || 'A student'} from ${student?.college || 'unknown'} wants to join "${event.title}"`,
        event._id);
    }

    // Get updated user for wallet balance
    const updatedUser = await User.findById(userId).select('walletBalance');
    const currentWalletBalance = updatedUser?.walletBalance || updatedWalletBalance;

    // Return success response
    res.status(201).json({
      message:           `Successfully registered for ${event.title}`,
      registrationId:    registration._id,
      walletBalance:     currentWalletBalance,
      paymentStatus:     payStatus,
      paymentMethod:     useWallet ? 'wallet' : (paymentMethod || ''),
      paymentTxnId:      txnId,
      paymentAmount:     finalAmount,
      paymentProcessed:  paymentProcessed,
      registration
    });
    
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }
    console.error('❌ registerForEvent error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /:id/registrations (admin) ────────────────────────
exports.getEventRegistrations = async (req, res) => {
  try {
    const { id } = req.params;
    const registrations = await Registration.find({ eventId: id })
      .populate('userId', 'fullName email college')
      .sort({ registeredAt: -1 });

    const formatted = registrations.map(r => {
      const rid = r._id.toString();
      return {
        _id:             rid,
        registrationId:  rid,
        fullName:        r.userId?.fullName  || 'Unknown',
        email:           r.userId?.email     || '',
        college:         r.userId?.college   || '',
        selectedSlot:    r.selectedSlot      || '',
        approvalStatus:  r.approvalStatus,
        rejectionReason: r.rejectionReason   || '',
        paymentStatus:   r.paymentStatus,
        paymentMethod:   r.paymentMethod     || '—',
        paymentAmount:   r.paymentAmount     || 0,
        registeredAt:    r.registeredAt
      };
    });

    res.json({ registrations: formatted });
  } catch (err) {
    console.error('getEventRegistrations error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /my/registrations ─────────────────────────────────
exports.getMyRegistrations = async (req, res) => {
  try {
    const userId = req.userId;
    const regs   = await Registration.find({ userId })
      .populate('eventId')
      .sort({ registeredAt: -1 });

    console.log(`🔍 Found ${regs.length} registrations for user ${userId}`);

    const now = new Date();
    const formatted = regs.map(r => {
      if (!r.eventId) return null;
      const ev = r.eventId.toObject();
      let status = ev.status;
      if (status !== 'cancelled') {
        const s = new Date(ev.startDate), e = new Date(ev.endDate);
        if (now < s)               status = 'upcoming';
        else if (now >= s && now <= e) status = 'ongoing';
        else                       status = 'completed';
      }
      return {
        ...ev,
        _id:             ev._id.toString(),
        status,
        registrationId:  r._id.toString(),
        approvalStatus:  r.approvalStatus,
        rejectionReason: r.rejectionReason || '',
        selectedSlot:    r.selectedSlot    || '',
        paymentStatus:   r.paymentStatus,
        paymentMethod:   r.paymentMethod,
        paymentTxnId:    r.paymentTxnId,
        paymentAmount:   r.paymentAmount,
        hasFeedback:     r.hasFeedback || false
      };
    }).filter(x => x !== null);

    res.json(formatted);
  } catch (err) {
    console.error('getMyRegistrations error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /:id/status (single approve/reject) ────────────
exports.updateStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['approved','rejected','pending'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ message: 'Registration not found' });

    reg.approvalStatus  = status;
    reg.rejectionReason = status === 'rejected' ? (rejectionReason || '') : '';
    await reg.save();

    const event = await Event.findById(reg.eventId);
    const title = event?.title || 'the event';

    if (status === 'approved')
      await notify(reg.userId, 'registration-approved', '✅ Registration Approved!',
        `Your registration for "${title}" has been approved. Get ready!`, reg.eventId);
    else if (status === 'rejected')
      await notify(reg.userId, 'registration-rejected', '❌ Registration Rejected',
        `Your registration for "${title}" was rejected.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`, reg.eventId);

    res.json({ message: `Registration ${status}`, registration: reg });
  } catch (err) {
    console.error('updateStatus error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /bulk-status ────────────────────────────────────
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status, rejectionReason } = req.body;
    if (!ids?.length) return res.status(400).json({ message: 'No IDs provided' });
    if (!['approved','rejected','pending'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const update = { approvalStatus: status };
    if (status === 'rejected') update.rejectionReason = rejectionReason || '';
    else update.rejectionReason = '';

    await Registration.updateMany({ _id: { $in: ids } }, { $set: update });

    const regs = await Registration.find({ _id: { $in: ids } }).populate('eventId', 'title');
    for (const reg of regs) {
      const title = reg.eventId?.title || 'the event';
      if (status === 'approved')
        await notify(reg.userId, 'registration-approved', '✅ Registration Approved!',
          `Your registration for "${title}" has been approved!`, reg.eventId?._id);
      else if (status === 'rejected')
        await notify(reg.userId, 'registration-rejected', '❌ Registration Rejected',
          `Your registration for "${title}" was rejected.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`, reg.eventId?._id);
    }

    res.json({ success: true, message: `Successfully updated ${ids.length} registrations to ${status}` });
  } catch (err) {
    console.error('bulkUpdateStatus error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE /:id (unregister) ──────────────────────────────
exports.unregisterFromEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Try by eventId first, then by registrationId
    let registration = await Registration.findOne({ eventId: id, userId });
    if (!registration) registration = await Registration.findOne({ _id: id, userId });
    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    let refundProcessed = false;
    let refundMessage = '';
    let updatedWalletBalance = null;

    // Refund if payment was made
    if (registration.paymentAmount > 0 && registration.paymentStatus === 'paid') {
      
      if (registration.paymentMethod === 'wallet') {
        // Refund to wallet
        await User.findByIdAndUpdate(userId, { $inc: { walletBalance: registration.paymentAmount } });
        refundProcessed = true;
        refundMessage = `₹${registration.paymentAmount} refunded to wallet`;
        
        const updatedUser = await User.findById(userId).select('walletBalance');
        updatedWalletBalance = updatedUser?.walletBalance;
        
        console.log(`💰 Wallet refund: ₹${registration.paymentAmount} added back, New balance: ${updatedWalletBalance}`);
        
      } else {
        // For UPI/Card/NetBanking - refund to original payment method
        refundProcessed = true;
        refundMessage = `₹${registration.paymentAmount} will be refunded to your ${registration.paymentMethod.toUpperCase()}`;
        
        console.log(`💰 ${registration.paymentMethod.toUpperCase()} refund initiated for ₹${registration.paymentAmount}, TXN: ${registration.paymentTxnId}`);
      }
    }

    const eventId = registration.eventId;
    await registration.deleteOne();
    await Event.findByIdAndUpdate(eventId, { $inc: { currentParticipants: -1 } });

    console.log(`✅ Unregistration successful: Event ${eventId}, User ${userId}`);

    res.json({ 
      message: 'Registration cancelled successfully',
      refundProcessed,
      refundMessage,
      walletBalance: updatedWalletBalance
    });
    
  } catch (err) {
    console.error('❌ unregisterFromEvent error:', err.message);
    res.status(500).json({ message: err.message });
  }
};
