# D&M Fire Safety - Fire Extinguisher Tracker

**Internal Use Only** - For use at dmfiresafety.com

A comprehensive React web application for managing fire extinguisher inspections, maintenance records, customer sites, and service tracking. Built with modern web technologies for efficient field operations and data management.

## 🎯 Project Overview

This is a professional fire safety management system designed for internal use by D&M Fire Safety. The application provides a complete solution for:

- **Asset Management**: Track fire extinguishers, exit lights, and emergency systems across multiple customer sites
- **Inspection Records**: Comprehensive inspection forms with checklist validation
- **Service Tracking**: Schedule and track service cycles for customers
- **Customer Management**: Complete customer database with contact information and service history
- **Reporting & Analytics**: Generate reports and track audit history
- **Run Sheets**: Organized work orders for field technicians
- **Calendar View**: Visual service scheduling

## 🛠️ Technology Stack

- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **LocalStorage** - Client-side data persistence (works offline)

## 📋 Features

### Core Functionality
- ✅ Dashboard with overview and quick actions
- ✅ Customer & Site Management
- ✅ Asset Registry (Extinguishers, Exit Lights, Systems)
- ✅ Inspection Forms with AI-powered analysis (optional)
- ✅ Service Tracker with scheduling
- ✅ Run Sheet Manager for field operations
- ✅ Calendar View for service dates
- ✅ Audit History & Reporting
- ✅ User Authentication with biometric support
- ✅ Dark Mode support

### Optional Integrations
- Dropbox backup/sync
- Supabase cloud database sync
- Voiply SMS/Voicemail integration
- DeviceMagic form integration
- Google Gemini AI (for inspection analysis)

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/adeelfeb/dmfiresafety.git
cd dmfiresafety
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000` (or next available port).

### Default Login Credentials

**Initial Admin Account:**
- Name: `tobey`
- PIN: `6876`

*Note: Additional users can be created in the Settings panel after logging in.*

## 📦 Build for Production

To create a production build:

```bash
npm run build
```

The optimized build will be in the `dist/` directory, ready for deployment.

## 💾 Data Storage

- **Primary Storage**: Browser localStorage (client-side)
- **Offline Support**: Full functionality without internet connection
- **Export/Import**: JSON and Excel export/import available
- **Cloud Backup**: Optional Dropbox and Supabase integrations

## 🔒 Security & Access

- User authentication with PIN-based login
- Role-based access (Admin/Tech)
- Biometric authentication support (TouchID/FaceID)
- Internal use only - designed for dmfiresafety.com

## 📁 Project Structure

```
├── components/        # React UI components
├── services/          # Business logic & API integrations
├── hooks/             # Custom React hooks
├── types.ts           # TypeScript type definitions
├── App.tsx            # Main application component
├── index.tsx          # Application entry point
└── index.html         # HTML template
```

## 🌐 Deployment

This application is designed for deployment to web hosting (e.g., GoDaddy). The production build creates static files that can be served from any web server.

**Production Build Steps:**
1. Run `npm run build`
2. Deploy the `dist/` folder contents to your web hosting
3. Configure server to serve `index.html` for all routes (SPA routing)

## 📝 Notes

- All data is stored locally in the browser's localStorage
- The application works completely offline after initial load
- Each browser/device maintains separate data
- Optional cloud sync can be configured in Settings

## 👥 Support

For questions or issues related to this application, please contact the development team.

---

**D&M Fire Safety** | Internal Use | dmfiresafety.com
