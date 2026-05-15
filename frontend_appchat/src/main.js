import './style.css'
import router from './router.js';
import userPage from './pages/UserPage.js';
import authPage from './pages/AuthPage.js';
import rolesPage from './pages/RolesPage.js';
import permissionsPage from './pages/PermissionsPage.js';
import rolePermissionsPage from './pages/RolePermissionsPage.js';
import chatPage from './pages/ChatPage.js';
import friendsPage from './pages/FriendsPage.js';

router.on('/chat', (el) => chatPage().render(el), { protected: true });
router.on('/friends', (el) => friendsPage().render(el), { protected: true });
router.on('/users', (el) => userPage().render(el), { protected: true });
router.on('/roles', (el) => rolesPage().render(el), { protected: true });
router.on('/permissions', (el) => permissionsPage().render(el), { protected: true });
router.on('/role-permissions', (el) => rolePermissionsPage().render(el), { protected: true });
router.on('/auth', (el) => authPage().render(el));
router.init();
