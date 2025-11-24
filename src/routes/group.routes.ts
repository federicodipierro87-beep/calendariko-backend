import { Router } from 'express';
import { GroupController } from '../controllers/group.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Applica il middleware di autenticazione a tutte le rotte
router.use(authenticateToken);

// Rotte per i gruppi
router.get('/', GroupController.getAllGroups);
router.get('/:id', GroupController.getGroupById);
router.post('/', GroupController.createGroup);
router.put('/:id', GroupController.updateGroup);
router.delete('/:id', GroupController.deleteGroup);

// Group members routes
router.post('/:groupId/members', GroupController.addMember);
router.delete('/:groupId/members/:userId', GroupController.removeMember);
router.get('/:groupId/members', GroupController.getGroupMembers);

export default router;