import { Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { EventService } from './event.service';
import { HttpClient } from '@angular/common/http';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  options?: { label: string; action: string }[];
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class ChatService {

  messages   = signal<ChatMessage[]>([]);
  isOpen     = signal<boolean>(false);
  navRequest = signal<string | null>(null);

  private botState = 'IDLE';
  private flowData: any = {};

  constructor(
    private authService: AuthService,
    private router: Router,
    private eventService: EventService,
    private http: HttpClient
  ) {
    // Reset chat when auth state changes (login / logout)
    this.authService.loginEvent$.subscribe(() => {
      this.messages.set([]);
      this.botState = 'IDLE';
      this.flowData = {};
      // If chat is open, show fresh welcome message for new session
      if (this.isOpen()) {
        this.sendWelcomeMessage();
      }
    });
  }

  // ─── OPEN / CLOSE ──────────────────────────────────────────────────────────

  toggleChat() {
    this.isOpen.set(!this.isOpen());
    if (this.isOpen() && this.messages().length === 0) {
      this.sendWelcomeMessage();
    }
  }

  // ─── MESSAGE HELPERS ────────────────────────────────────────────────────────

  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const newMessage: ChatMessage = {
      ...message,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, newMessage]);
  }

  /** Remove the last bot message (used to strip "Thinking…" placeholder) */
  private removeLastBotMessage() {
    const current = this.messages();
    if (current.length > 0 && current[current.length - 1].sender === 'bot') {
      this.messages.set(current.slice(0, -1));
    }
  }

  clearChat() {
    this.messages.set([]);
    this.botState = 'IDLE';
    this.flowData = {};
    this.sendWelcomeMessage();
  }

  // ─── WELCOME ────────────────────────────────────────────────────────────────

  sendWelcomeMessage() {
    const role      = this.authService.getRole();
    const isLoggedIn = this.authService.isLoggedIn();
    const fullName  = this.authService.getFullName() || 'User';

    this.botState = 'IDLE';
    this.flowData = {};

    if (isLoggedIn && role === 'student') {
      this.addMessage({
        sender: 'bot',
        text: `Hi ${fullName} 👋 I can help you with events.\nWould you like to:`,
        options: [
          { label: '1️⃣ View all events',  action: 'STUDENT_BROWSE'       },
          { label: '2️⃣ My Schedule',      action: 'STUDENT_SCHEDULE'     },
          { label: '🏆 Leaderboard',       action: 'STUDENT_LEADERBOARD'  },
          { label: '🎲 Surprise Me!',      action: 'STUDENT_SURPRISE'     },
          { label: '✨ Event Wizard',      action: 'STUDENT_WIZARD_START' }
        ]
      });
    } else if (isLoggedIn && role === 'college-admin') {
      this.addMessage({
        sender: 'bot',
        text: `Hello Admin ${fullName} 👋 What would you like to do?`,
        options: [
          { label: '✏️ Create new event',  action: 'ADMIN_CREATE_START' },
          { label: '📊 Manage my events',  action: 'ADMIN_MANAGE'       },
          { label: '❌ Cancel my event',   action: 'ADMIN_CANCEL_FLOW'  }
        ]
      });
    } else if (isLoggedIn && role === 'superadmin') {
      this.addMessage({
        sender: 'bot',
        text: `Hello Super Admin ${fullName} 👋 What would you like to do?`,
        options: [
          { label: '📊 Platform Stats',   action: 'SA_STATS'    },
          { label: '🏛️ View Colleges',    action: 'SA_COLLEGES' },
          { label: '👥 View Admins',      action: 'SA_ADMINS'   },
          { label: '📅 View All Events',  action: 'SA_EVENTS'   },
          { label: '📈 Reports',          action: 'SA_REPORTS'  }
        ]
      });
    } else {
      this.addMessage({
        sender: 'bot',
        text: 'Hi! 👋 Please log in to access your personalised event hub.',
        options: [
          { label: '🔑 How to Login',    action: 'AUTH_LOGIN'    },
          { label: '📝 How to Register', action: 'AUTH_REGISTER' }
        ]
      });
    }
  }

  // ─── FREE-TEXT FROM INPUT BOX ───────────────────────────────────────────────

  handleUserMessage(text: string) {
    this.addMessage({ sender: 'user', text });

    const lowerText  = text.toLowerCase();
    const role       = this.authService.getRole();
    const isLoggedIn = this.authService.isLoggedIn();

    // Greetings → show welcome
    if (lowerText.includes('hello') || lowerText.includes('hi')) {
      this.sendWelcomeMessage();
      return;
    }

    // Role-specific keyword shortcuts
    if (isLoggedIn && role === 'student') {
      if (lowerText.includes('schedule') || lowerText.includes('registered')) {
        this.handleAction('STUDENT_SCHEDULE');
        return;
      }
      if (lowerText.includes('browse') || lowerText.includes('events')) {
        this.handleAction('STUDENT_BROWSE');
        return;
      }
    }

    if (isLoggedIn && role === 'college-admin') {
      if (lowerText.includes('create') || lowerText.includes('new event')) {
        this.handleAction('ADMIN_CREATE_START');
        return;
      }
      if (lowerText.includes('manage') || lowerText.includes('my events')) {
        this.handleAction('ADMIN_MANAGE');
        return;
      }
    }

    // Fall through to AI
    this.addMessage({ sender: 'bot', text: 'Thinking... ⏳' });

    this.http.post('http://localhost:5000/api/chat/ask', { message: text, role }).subscribe({
      next: (res: any) => {
        this.removeLastBotMessage();
        this.addMessage({
          sender: 'bot',
          text: res.reply || 'I couldn\'t find an answer for that.',
          options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
        });
      },
      error: () => {
        this.removeLastBotMessage();
        this.addMessage({
          sender: 'bot',
          text: '⚠️ AI server is currently unavailable. Please try again later.',
          options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
        });
      }
    });
  }

  // ─── BUTTON / OPTION ACTIONS ────────────────────────────────────────────────

  handleAction(action: string) {

    // ── Universal ──────────────────────────────────────────────────────────────
    if (action === 'MAIN_MENU') {
      this.sendWelcomeMessage();
      return;
    }

    // ── Auth / guest actions ───────────────────────────────────────────────────
    if (action === 'AUTH_LOGIN') {
      this.addMessage({
        sender: 'bot',
        text: '🔑 To log in:\n1. Click the Login button at the top of the page, or go to /login\n2. Enter your registered email and password\n3. You\'ll be redirected to your dashboard automatically.',
        options: [
          { label: '📝 How to Register', action: 'AUTH_REGISTER' },
          { label: '🏠 Main Menu',        action: 'MAIN_MENU'     }
        ]
      });
      return;
    }

    if (action === 'AUTH_REGISTER') {
      this.addMessage({
        sender: 'bot',
        text: '📝 To register:\n1. Go to /register\n2. Fill in your full name, email, password and select your role (student or college-admin)\n3. Submit — you can log in straight away!',
        options: [
          { label: '🔑 How to Login', action: 'AUTH_LOGIN' },
          { label: '🏠 Main Menu',    action: 'MAIN_MENU'  }
        ]
      });
      return;
    }

    // ── Student actions ────────────────────────────────────────────────────────
    if (action === 'STUDENT_BROWSE') {
      this.addMessage({
        sender: 'bot',
        text: '🔍 Navigating to the All Events section of your dashboard…'
      });
      // Signal the dashboard to switch view — the student dashboard listens to navRequest
      this.navRequest.set('BROWSE_EVENTS');
      return;
    }

    if (action === 'STUDENT_SCHEDULE') {
      this.addMessage({ sender: 'bot', text: 'Checking your schedule… ⏳' });

      this.eventService.getMyRegistrations().subscribe({
        next: (regs: any[]) => {
          // Remove the "checking" message
          this.removeLastBotMessage();

          if (!regs || regs.length === 0) {
            this.addMessage({
              sender: 'bot',
              text: 'You are not registered for any events yet! Browse events to find something interesting.',
              options: [
                { label: '1️⃣ Browse Events', action: 'STUDENT_BROWSE' },
                { label: '🏠 Main Menu',      action: 'MAIN_MENU'     }
              ]
            });
          } else {
            let replyText = `You are registered for **${regs.length}** event(s):\n\n`;
            regs.forEach((r: any) => {
              const title  = r.event?.title || r.title || 'Untitled';
              const status = r.status       || r.event?.status || '';
              replyText += `✅ **${title}**${status ? ` — *${status}*` : ''}\n`;
            });
            this.addMessage({
              sender: 'bot',
              text: replyText,
              options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
            });
          }
        },
        error: () => {
          this.removeLastBotMessage();
          this.addMessage({
            sender: 'bot',
            text: '❌ Failed to fetch your schedule. Please try again.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        }
      });
      return;
    }

    if (action === 'STUDENT_LEADERBOARD') {
      this.addMessage({
        sender: 'bot',
        text: '🏆 Navigating to the Leaderboard…'
      });
      this.navRequest.set('LEADERBOARD');
      return;
    }

    if (action === 'STUDENT_SURPRISE') {
      this.addMessage({ sender: 'bot', text: '🎲 Finding a random event for you… ⏳' });

      this.eventService.getAllEvents({ status: 'upcoming' }).subscribe({
        next: (events: any[]) => {
          this.removeLastBotMessage();

          if (!events || events.length === 0) {
            this.addMessage({
              sender: 'bot',
              text: 'No upcoming events right now. Check back soon!',
              options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
            });
            return;
          }

          const randomEvent = events[Math.floor(Math.random() * events.length)];
          this.addMessage({
            sender: 'bot',
            text: `🎉 How about this one?\n\n**${randomEvent.title}**\n📍 ${randomEvent.venue || 'TBA'}\n📅 ${randomEvent.startDate ? new Date(randomEvent.startDate).toLocaleDateString() : 'TBA'}\n\nInterested?`,
            options: [
              { label: '🎲 Another one!', action: 'STUDENT_SURPRISE' },
              { label: '🏠 Main Menu',    action: 'MAIN_MENU'       }
            ]
          });
        },
        error: () => {
          this.removeLastBotMessage();
          this.addMessage({
            sender: 'bot',
            text: '❌ Couldn\'t load events right now.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        }
      });
      return;
    }

    if (action === 'STUDENT_WIZARD_START') {
      this.botState = 'WIZARD_TYPE';
      this.addMessage({
        sender: 'bot',
        text: '✨ Event Wizard! What type of event are you interested in?',
        options: [
          { label: '💻 Technical',  action: 'WIZARD_TYPE_technical'  },
          { label: '🎭 Cultural',   action: 'WIZARD_TYPE_cultural'   },
          { label: '⚽ Sports',     action: 'WIZARD_TYPE_sports'     },
          { label: '🛠️ Workshop',   action: 'WIZARD_TYPE_workshop'   },
          { label: '📣 Seminar',    action: 'WIZARD_TYPE_seminar'    }
        ]
      });
      return;
    }

    if (action.startsWith('WIZARD_TYPE_')) {
      const type = action.replace('WIZARD_TYPE_', '');
      this.flowData.wizardType = type;
      this.addMessage({ sender: 'bot', text: `Searching for **${type}** events… ⏳` });

      this.eventService.getAllEvents({ type, status: 'upcoming' }).subscribe({
        next: (events: any[]) => {
          this.removeLastBotMessage();

          if (!events || events.length === 0) {
            this.addMessage({
              sender: 'bot',
              text: `No upcoming **${type}** events found right now.`,
              options: [
                { label: '🔄 Try another type', action: 'STUDENT_WIZARD_START' },
                { label: '🏠 Main Menu',        action: 'MAIN_MENU'           }
              ]
            });
            return;
          }

          const top3  = events.slice(0, 3);
          let text    = `Found ${events.length} **${type}** event(s). Here are the top ones:\n\n`;
          top3.forEach((e: any) => {
            text += `🔹 **${e.title}** — ${e.venue || 'TBA'} | ${e.startDate ? new Date(e.startDate).toLocaleDateString() : 'TBA'}\n`;
          });

          this.addMessage({
            sender: 'bot',
            text,
            options: [
              { label: '📋 View all events', action: 'STUDENT_BROWSE' },
              { label: '🏠 Main Menu',       action: 'MAIN_MENU'     }
            ]
          });
        },
        error: () => {
          this.removeLastBotMessage();
          this.addMessage({
            sender: 'bot',
            text: '❌ Couldn\'t load events. Please try again.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        }
      });
      return;
    }

    if (action.startsWith('STUDENT_SHARE_EVENT_')) {
      const shareUrl = `${window.location.origin}/student-dashboard`;
      (navigator as any).clipboard?.writeText(
        `Check out this event on Campus Event Hub! ${shareUrl}`
      ).then(() => {
        this.addMessage({ sender: 'bot', text: '✅ Event link copied to clipboard!' });
      }).catch(() => {
        this.addMessage({ sender: 'bot', text: `📋 Share this link: ${shareUrl}` });
      });
      return;
    }

    // ── Admin actions ──────────────────────────────────────────────────────────
    if (action === 'ADMIN_CREATE_START') {
      this.addMessage({
        sender: 'bot',
        text: '✏️ To create a new event, go to your Admin Dashboard and click the **"+ Create Event"** button. You can fill in all the details there.',
        options: [
          { label: '📊 Go to Dashboard', action: 'ADMIN_MANAGE' },
          { label: '🏠 Main Menu',       action: 'MAIN_MENU'   }
        ]
      });
      this.navRequest.set('ADMIN_CREATE');
      return;
    }

    if (action === 'ADMIN_MANAGE') {
      this.addMessage({
        sender: 'bot',
        text: '📊 Navigating to your events management view…'
      });
      this.navRequest.set('ADMIN_EVENTS');
      return;
    }

    if (action === 'ADMIN_CANCEL_FLOW') {
      this.addMessage({ sender: 'bot', text: 'Loading your events… ⏳' });

      this.eventService.getAllEvents().subscribe({
        next: (events: any[]) => {
          this.removeLastBotMessage();
          const myUserId = this.authService.getUserId();
          const myEvents = events.filter(
            (e: any) => String(e.createdBy) === String(myUserId) && e.status !== 'cancelled'
          );

          if (!myEvents || myEvents.length === 0) {
            this.addMessage({
              sender: 'bot',
              text: 'You have no active events to cancel.',
              options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
            });
            return;
          }

          this.addMessage({
            sender: 'bot',
            text: `You have **${myEvents.length}** active event(s). Go to the Events tab in your dashboard to cancel them.`,
            options: [
              { label: '📊 Manage Events', action: 'ADMIN_MANAGE' },
              { label: '🏠 Main Menu',     action: 'MAIN_MENU'   }
            ]
          });
        },
        error: () => {
          this.removeLastBotMessage();
          this.addMessage({
            sender: 'bot',
            text: '❌ Could not load your events.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        }
      });
      return;
    }

    // ── Super admin ────────────────────────────────────────────────────────────
    if (action === 'SUPERADMIN_DASHBOARD' || action === 'SA_DASHBOARD') {
      this.router.navigate(['/super-admin-dashboard']);
      return;
    }

    if (action === 'SA_STATS') {
      this.eventService.getStats().subscribe({
        next: (stats: any) => {
          this.addMessage({
            sender: 'bot',
            text: `📊 **Platform Overview:**\n\n🏛️ Total Events: **${stats.totalEvents}**\n📅 Upcoming Events: **${stats.upcomingEvents}**\n👥 College Admins: **${stats.totalAdmins}**\n👤 Students: **${stats.totalStudents}**`,
            options: [
              { label: '📅 View Events',   action: 'SA_EVENTS'   },
              { label: '📈 Reports',       action: 'SA_REPORTS'  },
              { label: '🏠 Main Menu',     action: 'MAIN_MENU'   }
            ]
          });
        },
        error: () => {
          this.addMessage({
            sender: 'bot',
            text: '❌ Could not load stats. Make sure the backend is running.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        }
      });
      return;
    }

    if (action === 'SA_COLLEGES') {
      this.addMessage({
        sender: 'bot',
        text: '🏛️ Navigating to the Colleges section of your dashboard…'
      });
      this.navRequest.set('SA_VIEW_COLLEGES');
      return;
    }

    if (action === 'SA_ADMINS') {
      this.addMessage({
        sender: 'bot',
        text: '👥 Navigating to the Admins section…'
      });
      this.navRequest.set('SA_VIEW_ADMINS');
      return;
    }

    if (action === 'SA_EVENTS') {
      this.addMessage({ sender: 'bot', text: 'Loading all events… ⏳' });
      this.eventService.getAllEvents().subscribe({
        next: (events: any[]) => {
          this.removeLastBotMessage();
          const upcoming  = events.filter(e => e.status === 'upcoming').length;
          const ongoing   = events.filter(e => e.status === 'ongoing').length;
          const completed = events.filter(e => e.status === 'completed').length;
          this.addMessage({
            sender: 'bot',
            text: `📅 There are **${events.length}** total events:\n✅ Upcoming: **${upcoming}**\n🟢 Ongoing: **${ongoing}**\n✔️ Completed: **${completed}**`,
            options: [
              { label: '📋 Go to Events tab', action: 'SA_VIEW_EVENTS' },
              { label: '📈 Reports',          action: 'SA_REPORTS'     },
              { label: '🏠 Main Menu',        action: 'MAIN_MENU'      }
            ]
          });
        },
        error: () => {
          this.removeLastBotMessage();
          this.addMessage({
            sender: 'bot',
            text: '❌ Could not load events.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        }
      });
      return;
    }

    if (action === 'SA_VIEW_EVENTS') {
      this.addMessage({ sender: 'bot', text: '📅 Navigating to All Events tab…' });
      this.navRequest.set('SA_VIEW_EVENTS');
      return;
    }

    if (action === 'SA_REPORTS') {
      this.addMessage({
        sender: 'bot',
        text: '📈 Go to the **Reports** section of your dashboard to download CSV reports for events, colleges, users and financials.',
        options: [
          { label: '📊 Go to Reports', action: 'SA_VIEW_REPORTS' },
          { label: '🏠 Main Menu',     action: 'MAIN_MENU'       }
        ]
      });
      return;
    }

    if (action === 'SA_VIEW_REPORTS') {
      this.addMessage({ sender: 'bot', text: '📈 Navigating to Reports…' });
      this.navRequest.set('SA_VIEW_REPORTS');
      return;
    }

    // ── Fallback for any unhandled action ──────────────────────────────────────
    this.addMessage({
      sender: 'bot',
      text: 'I\'m not sure how to handle that. Let me take you back to the main menu.',
      options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
    });
  }
}