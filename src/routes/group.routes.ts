import { Router } from 'express';
import { GroupController } from '../controllers/group.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, GroupController.getAllGroups);
router.get('/my-groups', authenticateToken, GroupController.getUserGroups);
router.get('/:id', authenticateToken, GroupController.getGroupById);
router.post('/', authenticateToken, requireAdmin, GroupController.createGroup);
router.put('/:id', authenticateToken, requireAdmin, GroupController.updateGroup);
router.delete('/:id', authenticateToken, requireAdmin, GroupController.deleteGroup);
router.post('/:id/members', authenticateToken, requireAdmin, GroupController.addMember);
router.delete('/:id/members/:userId', authenticateToken, requireAdmin, GroupController.removeMember);
router.post('/:id/join', authenticateToken, GroupController.joinGroup);
router.delete('/:id/leave', authenticateToken, GroupController.leaveGroup);

export default router;