const express = require('express');
const {
  getUserProfile,
  updateUserInfo,
  changeUserPassword,
  updateUserServices,
  updateUserServiceAreas,
  deleteUser
} = require('../controllers/userProfileController');
const { 
  validateUserId, 
  validateUserProfileUpdate, 
  validatePasswordChange 
} = require('../middleware/validation');
const { authenticateAndOwnResource } = require('../middleware/auth');

const router = express.Router();

// Define routes for user profile operations with authentication and validation
router.get('/:id', validateUserId, authenticateAndOwnResource, getUserProfile);
router.put('/info/:id', validateUserId, validateUserProfileUpdate, authenticateAndOwnResource, updateUserInfo);
router.patch('/password/:id', validateUserId, validatePasswordChange, authenticateAndOwnResource, changeUserPassword);
router.put('/services/:id', validateUserId, authenticateAndOwnResource, updateUserServices);
router.put('/areas/:id', validateUserId, authenticateAndOwnResource, updateUserServiceAreas);
router.delete('/:id', validateUserId, authenticateAndOwnResource, deleteUser);


module.exports = router;
