# Calendariko - Event Management Portal for Bands & DJs

A comprehensive web application for managing events, availability, and coordination between bands, DJs, and event organizers.

## 🚀 Features

- **User Management**: Admin and Artist roles with different permissions
- **Group Management**: Organize artists into bands, DJ groups, or solo acts
- **Event Management**: Create, update, and track events with detailed information
- **Calendar Integration**: Interactive calendar with FullCalendar showing events and availability
- **Availability Tracking**: Artists can mark their availability/unavailability for dates
- **Email Notifications**: Automated notifications for event creation/updates
- **Responsive Design**: Mobile-friendly interface with TailwindCSS

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- TailwindCSS for styling
- FullCalendar for calendar functionality
- Axios for API communication
- Vite for build tooling

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM with PostgreSQL
- JWT authentication with refresh tokens
- Nodemailer for email notifications
- bcrypt for password hashing

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Email account for notifications (Gmail recommended)

## 🔧 Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd calendariko
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Database Setup

1. Create a PostgreSQL database
2. Copy the environment variables:
```bash
cp .env.example .env
```

3. Update the `.env` file with your database and email configuration:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/calendariko"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
JWT_EXPIRE="15m"
JWT_REFRESH_EXPIRE="7d"
PORT=3000
NODE_ENV="development"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
FRONTEND_URL="http://localhost:5173"
```

4. Generate Prisma client and run migrations:
```bash
npx prisma generate
npx prisma db push
```

5. (Optional) Seed the database with initial data:
```bash
npx prisma db seed
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

Create the frontend `.env` file:
```env
VITE_API_URL="http://localhost:3000/api"
```

## 🚀 Running the Application

### Development Mode

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Production Build

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Build the backend:
```bash
cd backend
npm run build
```

3. Start the production server:
```bash
cd backend
npm start
```

## 🔑 Default Admin Account

After setting up the database, create an admin account using the API or database directly:

```sql
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES ('admin@calendariko.com', '$2b$12$hashed_password', 'Admin', 'User', 'ADMIN');
```

Or use the registration endpoint with admin privileges.

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/register` - Register new user (admin only)

### User Management
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

### Group Management
- `GET /api/groups` - Get all groups
- `GET /api/groups/:id` - Get group by ID
- `POST /api/groups` - Create group (admin only)
- `PUT /api/groups/:id` - Update group (admin only)
- `DELETE /api/groups/:id` - Delete group (admin only)

### Event Management
- `GET /api/events` - Get events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create event (admin only)
- `PUT /api/events/:id` - Update event (admin only)
- `DELETE /api/events/:id` - Delete event (admin only)

### Availability Management
- `GET /api/availability` - Get availability data
- `POST /api/availability` - Create availability entry
- `PUT /api/availability/:id` - Update availability
- `DELETE /api/availability/:id` - Delete availability

## 🎨 User Interface

### Admin Features
- Full CRUD operations for users, groups, and events
- View all calendar data across groups
- Manage group memberships
- Access to all analytics and reports

### Artist Features
- View events for their assigned groups
- Manage availability for each group
- View calendar with their events and availability
- Update personal profile information

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- CORS protection
- Helmet.js security headers
- SQL injection protection via Prisma

## 🎯 Permissions System

### Admin Role
- Complete access to all features
- User and group management
- Event creation and management
- View all data across the system

### Artist Role
- View events for their groups only
- Manage their own availability
- Update their own profile
- Limited to groups they belong to

## 📧 Email Notifications

The system sends automated emails for:
- New event creation
- Event updates
- Event cancellations
- Welcome emails for new users
- Availability reminders

Configure your email settings in the `.env` file. Gmail users should use App Passwords.

## 🌍 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
PORT=3000
NODE_ENV=development
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Ensure database exists

2. **Email Not Sending**
   - Verify email credentials in .env
   - For Gmail, use App Passwords
   - Check firewall/network settings

3. **JWT Token Issues**
   - Ensure JWT secrets are set in .env
   - Check token expiration times
   - Verify frontend API URL

4. **Frontend Build Errors**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all environment variables

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting section

---

Made with ❤️ for the music community