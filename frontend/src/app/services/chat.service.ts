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

<<<<<<< Updated upstream
    const lowerText  = text.toLowerCase();
    const role       = this.authService.getRole();
=======
    // Handle stateful flows
    if (this.botState.startsWith('ADMIN_CREATE_')) {
      this.handleAdminCreateFlow(text);
      return;
    }

    if (this.botState === 'AWAITING_FALLBACK_EMAIL') {
      this.flowData.fallbackEmail = text;
      this.botState = 'IDLE';
      const originalMessage = this.flowData.pendingMessage || 'Hello';
      this.sendToGemini(originalMessage, this.authService.getRole(), this.authService.isLoggedIn());
      return;
    }

    // NLP / Generic fallback
    const lowerText = text.toLowerCase();
    const role = this.authService.getRole();
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    // Fall through to AI
    this.addMessage({ sender: 'bot', text: 'Thinking... ⏳' });

    this.http.post('http://localhost:5000/api/chat/ask', { message: text, role }).subscribe({
      next: (res: any) => {
        this.removeLastBotMessage();
=======
    // FAQ MATCHING (Global)
    if (lowerText.includes('password') || lowerText.includes('reset')) {
      this.addMessage({ sender: 'bot', text: 'If you need to reset your password, please contact your College Administrator or the Super Admin.' });
      return;
    }
    if (lowerText.includes('who') || lowerText.includes('created') || lowerText.includes('support')) {
      this.addMessage({ sender: 'bot', text: 'This platform is the Campus Event Hub, built to streamline event management! Contact support@campushub.edu for help.' });
      return;
    }

    if (lowerText.includes('help') || lowerText.includes('what can you do') || lowerText.includes('question')) {
      this.sendHelpMessage(role, isLoggedIn);
      return;
    }

    // AI FALLBACK (Gemini integration)
    this.sendToGemini(text, role, isLoggedIn);
  }

  private sendToGemini(text: string, role: string | null, isLoggedIn: boolean) {
    this.addMessage({ sender: 'bot', text: 'Thinking... ⏳' });

    const payload: any = { message: text, role };
    if (this.flowData.fallbackEmail) {
      payload.fallbackEmail = this.flowData.fallbackEmail;
    }

    const token = this.authService.getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    this.http.post('http://localhost:5000/api/chat/ask', payload, { headers }).subscribe({
      next: (res: any) => {
        // Remove the 'Thinking... ⏳' message
        const currentMessages = this.messages();
        if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].text === 'Thinking... ⏳') {
          this.messages.set(currentMessages.slice(0, -1));
        }

        if (res.requiresEmail) {
          this.botState = 'AWAITING_FALLBACK_EMAIL';
          this.flowData.pendingMessage = text;
          this.addMessage({ sender: 'bot', text: res.reply });
          return;
        }

>>>>>>> Stashed changes
        this.addMessage({
          sender: 'bot',
          text: res.reply || 'I couldn\'t find an answer for that.',
          options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
        });

        // Clear fallback email after successful use
        if (this.flowData.fallbackEmail) {
          delete this.flowData.fallbackEmail;
        }
      },
      error: () => {
        this.removeLastBotMessage();
        this.addMessage({
          sender: 'bot',
<<<<<<< Updated upstream
          text: '⚠️ AI server is currently unavailable. Please try again later.',
          options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
        });
      }
    });
=======
          text: 'I\'m having trouble connecting to my AI brain right now. However, I can still answer specific questions!'
        });
        this.sendHelpMessage(role, isLoggedIn);
      }
    });
  }

  private sendHelpMessage(role: string | null, isLoggedIn: boolean) {
    let helpText = 'Here are the questions and commands I am programmed to answer:\n\n';

    if (isLoggedIn && role === 'student') {
      helpText += '• "Show me upcoming events"\n';
      helpText += '• "What is my event schedule?"\n';
      helpText += '• "Find me a tech / cultural / sports event"\n';
    } else if (isLoggedIn && role === 'college-admin') {
      helpText += '• "I need to cancel an event"\n';
      helpText += '• Use the menu buttons to Create and Manage events\n';
    } else {
      helpText += '• "How do I login?"\n';
      helpText += '• "How do I register?"\n';
      helpText += '• "Show me upcoming events"\n';
    }
    helpText += '\n• "I forgot my password"\n';
    helpText += '• "Who created this website?"\n';

    this.addMessage({ sender: 'bot', text: helpText, options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }] });
  }

  handleAction(action: string) {

    if (action.startsWith('ADMIN_CAT_')) {
      const category = action.replace('ADMIN_CAT_', '').toLowerCase();
      this.handleAdminCreateFlow(category);
      return;
    }

    if (action === 'ADMIN_CANCEL_FLOW') {
      this.addMessage({ sender: 'bot', text: 'Fetching events you created... ⏳' });
      this.eventService.getAllEvents().subscribe(events => {
        const myEmail = this.authService.getEmail();

        // BUG FIX: Filters events so you only see what YOU created
        const myEvents = events.filter(e => e.contactEmail === myEmail);

        if (myEvents.length === 0) {
          this.addMessage({ sender: 'bot', text: 'You have no active events to cancel.' });
        } else {
          this.addMessage({
            sender: 'bot',
            text: 'Select an event to cancel (Owner Only):',
            options: myEvents.map(e => ({ label: `❌ Cancel: ${e.title}`, action: `CONFIRM_DELETE_${e._id}` }))
          });
        }
      });
    }

    if (action === 'MAIN_MENU') {
      this.sendWelcomeMessage();
      return;
    }

    // NAV-ASSIST ACTIONS
    if (action.startsWith('NAV_')) {
      const view = action.replace('NAV_', '').toLowerCase();
      this.navRequest.set(view);
      this.addMessage({ sender: 'bot', text: `Sure! I'm taking you to the **${view}** section now. 🧭` });
      // Reset after a short delay so it can be re-triggered
      setTimeout(() => this.navRequest.set(null), 500);
      return;
    }

    // ONBOARDING ACTIONS
    else if (action === 'ONBOARD_STUDENT_NEXT') {
      this.addMessage({
        sender: 'bot',
        text: 'Here, you can discover amazing events happening exactly what you care about!\nYou can browse all events, save them to your schedule, and check your digital tickets. Want to find your first event right now?',
        options: [
          { label: 'Yes, show me top events!', action: 'ONBOARD_STUDENT_FINISH_YES' },
          { label: 'No, I\'ll explore myself', action: 'ONBOARD_STUDENT_FINISH_NO' }
        ]
      });
    }
    else if (action === 'ONBOARD_STUDENT_FINISH_YES') {
      const email = this.authService.getEmail() || 'guest';
      localStorage.setItem(`hasSeenOnboarding_${email}`, 'true');
      this.handleAction('STUDENT_INLINE_EVENTS');
    }
    else if (action === 'ONBOARD_STUDENT_FINISH_NO') {
      const email = this.authService.getEmail() || 'guest';
      localStorage.setItem(`hasSeenOnboarding_${email}`, 'true');
      this.sendWelcomeMessage();
    }
    else if (action === 'ONBOARD_ADMIN_NEXT') {
      this.addMessage({
        sender: 'bot',
        text: 'As a College Admin, you have full control. You can create events, manage registrations, and view student feedback all from your dashboard.\nIt\'s super easy! I can actually help you create your very first event right here in the chat. Want to try?',
        options: [
          { label: 'Yes, let\'s create one!', action: 'ONBOARD_ADMIN_FINISH_YES' },
          { label: 'Maybe later', action: 'ONBOARD_ADMIN_FINISH_NO' }
        ]
      });
    }
    else if (action === 'ONBOARD_ADMIN_FINISH_YES') {
      const email = this.authService.getEmail() || 'admin';
      localStorage.setItem(`hasSeenOnboarding_${email}`, 'true');
      this.handleAction('ADMIN_CREATE_START');
    }
    else if (action === 'ONBOARD_ADMIN_FINISH_NO') {
      const email = this.authService.getEmail() || 'admin';
      localStorage.setItem(`hasSeenOnboarding_${email}`, 'true');
      this.sendWelcomeMessage();
    }

    // STUDENT ACTIONS
    if (action === 'STUDENT_LEADERBOARD') {
      this.handleAction('NAV_LEADERBOARD');
      return;
    }

    if (action === 'STUDENT_BROWSE') {
      this.router.navigate(['/student/dashboard']);
      this.addMessage({ sender: 'bot', text: 'I have taken you to the Event Listings page! You can browse and register for all available events there.' });
    }
    else if (action === 'STUDENT_FILTER_DATE') {
      this.addMessage({ sender: 'bot', text: 'To filter by date, please use the Start Date / End Date filters on the Event Listings page.' });
    }
    else if (action === 'STUDENT_FILTER_CAT') {
      this.addMessage({ sender: 'bot', text: 'You can use the Category dropdown on the Event Listings page to filter by Technical, Cultural, etc.' });
    }
    else if (action === 'STUDENT_INLINE_EVENTS') {
      this.addMessage({ sender: 'bot', text: 'Fetching top upcoming events... ⏳' });
      this.eventService.getAllEvents().subscribe({
        next: (events) => {
          const upcoming = events.filter(e => e.status === 'upcoming').slice(0, 3);
          if (upcoming.length === 0) {
            this.addMessage({ sender: 'bot', text: 'There are no upcoming events at the moment.' });
          } else {
            let replyText = 'Here are 3 top upcoming events:\n\n';
            upcoming.forEach(e => {
              replyText += `📅 **${e.title}** (${new Date(e.startDate).toLocaleDateString()})\n`;
              replyText += `   *${e.type}* @ ${e.venue}\n\n`;
            });
            this.addMessage({
              sender: 'bot',
              text: replyText,
              options: [
                { label: 'Browse all events to register 👉', action: 'STUDENT_BROWSE' },
                ...upcoming.map(e => ({ label: `🔗 Share: ${e.title}`, action: `STUDENT_SHARE_EVENT_${e._id}` }))
              ]
            });
          }
        }
      });
    }
    else if (action === 'STUDENT_SURPRISE') {
      this.addMessage({ sender: 'bot', text: 'Spinning the event roulette... 🎲⏳' });
      this.eventService.getAllEvents().subscribe({
        next: (events) => {
          const upcoming = events.filter(e => e.status === 'upcoming');
          if (upcoming.length === 0) {
            this.addMessage({ sender: 'bot', text: 'Oh no! There are no upcoming events right now to surprise you with. 😢' });
          } else {
            const randomEvent = upcoming[Math.floor(Math.random() * upcoming.length)];
            const replyText = `🎉 **SURPRISE!** 🎉\n\nYou should definitely check out:\n\n**${randomEvent.title}**\n*Category*: ${randomEvent.type}\n*Venue*: ${randomEvent.venue}\n*Date*: ${new Date(randomEvent.startDate).toLocaleDateString()}`;
            this.addMessage({
              sender: 'bot',
              text: replyText,
              options: [
                { label: 'Sounds awesome, take me there! 👉', action: 'STUDENT_BROWSE' },
                { label: `🔗 Share Event`, action: `STUDENT_SHARE_EVENT_${randomEvent._id}` },
                { label: 'Spin again 🎲', action: 'STUDENT_SURPRISE' }
              ]
            });
          }
        },
        error: () => this.addMessage({ sender: 'bot', text: 'Oops! The roulette wheel broke. Try again later.' })
      });
    }
    else if (action === 'STUDENT_WIZARD_START') {
      this.addMessage({
        sender: 'bot',
        text: '🔮 **Event Wizard**\n\nLet\'s find the perfect event for you! What is your vibe today?',
        options: [
          { label: '🧠 Learning & Skilling', action: 'STUDENT_WIZARD_LEARN' },
          { label: '🥳 Social & Fun', action: 'STUDENT_WIZARD_FUN' },
          { label: '🏆 Competition', action: 'STUDENT_WIZARD_COMPETE' }
        ]
      });
    }
    else if (action === 'STUDENT_WIZARD_LEARN' || action === 'STUDENT_WIZARD_FUN' || action === 'STUDENT_WIZARD_COMPETE') {
      this.addMessage({ sender: 'bot', text: 'Consulting the magic crystal ball... 🔮⏳' });
      this.eventService.getAllEvents().subscribe({
        next: (events) => {
          let targetCategories: string[] = [];
          let vibeName = '';

          if (action === 'STUDENT_WIZARD_LEARN') {
            targetCategories = ['technical', 'workshop', 'seminar'];
            vibeName = 'Learning & Skilling';
          } else if (action === 'STUDENT_WIZARD_FUN') {
            targetCategories = ['cultural'];
            vibeName = 'Social & Fun';
          } else if (action === 'STUDENT_WIZARD_COMPETE') {
            targetCategories = ['sports'];
            vibeName = 'Competition';
          }

          const recommended = events.filter(e => e.status === 'upcoming' && targetCategories.includes(e.type)).slice(0, 2);

          if (recommended.length === 0) {
            this.addMessage({
              sender: 'bot',
              text: `Looks like there are no upcoming events that match the **${vibeName}** vibe right now. Check back later!`,
              options: [{ label: 'Try another vibe 🔮', action: 'STUDENT_WIZARD_START' }, { label: '🏠 Main Menu', action: 'MAIN_MENU' }]
            });
          } else {
            let replyText = `✨ Based on your **${vibeName}** vibe, I recommend:\n\n`;
            recommended.forEach(e => {
              replyText += `**${e.title}**\n📍 ${e.venue} | 📅 ${new Date(e.startDate).toLocaleDateString()}\n\n`;
            });
            this.addMessage({
              sender: 'bot',
              text: replyText,
              options: [
                { label: 'Register for these! 👉', action: 'STUDENT_BROWSE' },
                ...recommended.map(e => ({ label: `🔗 Share: ${e.title}`, action: `STUDENT_SHARE_EVENT_${e._id}` })),
                { label: 'Try another vibe 🔮', action: 'STUDENT_WIZARD_START' }
              ]
            });
          }
        },
        error: () => this.addMessage({ sender: 'bot', text: 'The crystal ball is cloudy. Try again later.' })
      });
    }
    else if (action === 'STUDENT_SCHEDULE') {
      this.addMessage({ sender: 'bot', text: 'Let me check your schedule... ⏳' });
      const email = this.authService.getEmail();
      if (!email) {
        this.addMessage({ sender: 'bot', text: 'Could not find your user data to check your schedule.' });
        return;
      }
      this.eventService.getUserRegistrations(email).subscribe({
        next: (regs) => {
          if (!regs || regs.length === 0) {
            this.addMessage({ sender: 'bot', text: 'You are not registered for any events yet!' });
          } else {
            let replyText = 'Here is what you are registered for:\n\n';
            regs.forEach((r: any) => {
              replyText += `✅ **${r.event.title}** - *${r.status}*\n`;
            });
            this.addMessage({ sender: 'bot', text: replyText });
          }
        },
        error: () => this.addMessage({ sender: 'bot', text: 'Failed to fetch your schedule.' })
      });
    }

    // STUDENT POLL ACTIONS
    else if (action === 'STUDENT_POLL_START') {
      this.addMessage({
        sender: 'bot',
        text: '📊 **Quick Poll**\n\nWhat type of events do you want to see more of this semester? Your feedback helps organizers!',
        options: [
          { label: '💻 Hackathons', action: 'STUDENT_POLL_VOTE_HACKATHON' },
          { label: '🎭 Cultural Fests', action: 'STUDENT_POLL_VOTE_CULTURAL' },
          { label: '🏆 Sports Tournaments', action: 'STUDENT_POLL_VOTE_SPORTS' },
          { label: '🎙️ Guest Lectures', action: 'STUDENT_POLL_VOTE_LECTURES' }
        ]
      });
    }
    else if (action.startsWith('STUDENT_POLL_VOTE_')) {
      const voteType = action.replace('STUDENT_POLL_VOTE_', '');

      // Hardcoded base results for the mock visual feedback
      const results: any = {
        HACKATHON: { label: '💻 Hackathons', count: 42 },
        CULTURAL: { label: '🎭 Cultural Fests', count: 28 },
        SPORTS: { label: '🏆 Sports Tournaments', count: 15 },
        LECTURES: { label: '🎙️ Guest Lectures', count: 15 }
      };

      // Register their vote in the mock data
      if (results[voteType]) {
        results[voteType].count += 1;
      }

      const totalVotes = Object.values(results).reduce((sum: number, r: any) => sum + r.count, 0);

      let replyText = '✅ **Thanks for voting!** Here are the current results:\n\n';
      Object.keys(results).forEach(key => {
        const item = results[key];
        const percentage = Math.round((item.count / totalVotes) * 100);
        // Create a simple visual text bar 
        const barSize = Math.round(percentage / 10);
        const bar = '█'.repeat(barSize) + '░'.repeat(10 - barSize);

        replyText += `**${item.label}**\n${bar} ${percentage}% (${item.count} votes)\n\n`;
      });

      this.addMessage({
        sender: 'bot',
        text: replyText,
        options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
      });
    }

    // AUTH ACTIONS
    else if (action === 'AUTH_LOGIN') {
      this.addMessage({
        sender: 'bot',
        text: 'To log in, please click the button below. You will be asked for your Email Address and Password. Let me know if you need help recovering an account!',
        options: [{ label: 'Go to Login Page 🔑', action: 'NAVIGATE_LOGIN' }]
      });
    }
    else if (action === 'NAVIGATE_LOGIN') {
      this.router.navigate(['/login']);
      this.addMessage({ sender: 'bot', text: 'Taking you there now!' });
    }
    else if (action === 'AUTH_REGISTER') {
      this.addMessage({
        sender: 'bot',
        text: 'To join us, you will need to provide your Full Name, Email, Password, and your College/University name. Click below to open the form!',
        options: [{ label: 'Go to Registration Page 📝', action: 'NAVIGATE_REGISTER' }]
      });
    }
    else if (action === 'NAVIGATE_REGISTER') {
      this.router.navigate(['/register']);
      this.addMessage({ sender: 'bot', text: 'Taking you there now!' });
    }
    else if (action === 'GUEST_PREVIEW_EVENTS') {
      this.addMessage({ sender: 'bot', text: 'Fetching top upcoming events... ⏳' });
      this.eventService.getAllEvents().subscribe({
        next: (events) => {
          const upcoming = events.filter(e => e.status === 'upcoming').slice(0, 3);
          if (upcoming.length === 0) {
            this.addMessage({ sender: 'bot', text: 'There are no upcoming events at the moment.' });
          } else {
            let replyText = 'Here is a sneak peek at our top upcoming events:\n\n';
            upcoming.forEach(e => {
              replyText += `📅 **${e.title}** (${new Date(e.startDate).toLocaleDateString()})\n`;
              replyText += `   *${e.type}* @ ${e.venue}\n\n`;
            });
            this.addMessage({
              sender: 'bot',
              text: replyText,
              options: [
                { label: 'Register to join! 📝', action: 'AUTH_REGISTER' },
                { label: '🏠 Main Menu', action: 'MAIN_MENU' }
              ]
            });
          }
        },
        error: () => this.addMessage({ sender: 'bot', text: 'Failed to fetch events.' })
      });
    }

    // SHARING ACTIONS
    else if (action.startsWith('STUDENT_SHARE_EVENT_')) {
      const eventId = action.replace('STUDENT_SHARE_EVENT_', '');
      const shareUrl = `${window.location.origin}/student/dashboard`;
      // In a real app with deep links this might be /events/:eventId

      navigator.clipboard.writeText(`Check out this event on Campus Event Hub! ${shareUrl}`).then(() => {
        this.addMessage({ sender: 'bot', text: '✅ Event link copied to your clipboard!' });
      }).catch(err => {
        console.error('Failed to copy', err);
        this.addMessage({ sender: 'bot', text: `Here is the link to share: ${shareUrl}` });
      });
    }

    // SUPER ADMIN ACTIONS
    else if (action === 'SUPER_STATS') {
      this.router.navigate(['/superadmin/dashboard']);
      this.addMessage({ sender: 'bot', text: 'I have navigated you to the Super Admin Dashboard. You can view total platform statistics at the top.' });
    }
    else if (action === 'SUPER_USERS') {
      this.router.navigate(['/superadmin/dashboard']);
      this.addMessage({ sender: 'bot', text: 'Navigate to the Users or Admins tabs in your dashboard to manage accounts.' });
    }

    // ADMIN ACTIONS (CREATE FLOW)
    else if (action === 'ADMIN_MANAGE') {
      this.router.navigate(['/organizer/dashboard']);
      this.addMessage({ sender: 'bot', text: 'Taking you to your dashboard to manage your events.' });
    }
    else if (action === 'ADMIN_CANCEL_FLOW') {
      this.botState = 'ADMIN_CANCEL_SELECT';
      this.addMessage({ sender: 'bot', text: 'Fetching your active events... ⏳' });

      this.eventService.getAllEvents().subscribe({
        next: (events) => {
          // In a real app we'd filter by logged in organizer ID. 
          // For the chatbot demo, we just show upcoming events to cancel.
          const myEvents = events.filter(e => e.status === 'upcoming');
          if (myEvents.length === 0) {
            this.botState = 'IDLE';
            this.addMessage({ sender: 'bot', text: 'You have no upcoming events to cancel!' });
          } else {
            const options = myEvents.slice(0, 5).map(e => ({
              label: `❌ Cancel: ${e.title}`,
              action: `ADMIN_CONFIRM_CANCEL_${e._id}`
            }));
            options.push({ label: '🔙 Go Back', action: 'MAIN_MENU' });

            this.addMessage({
              sender: 'bot',
              text: 'Please select an event to cancel. **Warning: This cannot be undone.**',
              options: options
            });
          }
        },
        error: () => this.addMessage({ sender: 'bot', text: 'Failed to load your events.' })
      });
    }
    else if (action.startsWith('ADMIN_CONFIRM_CANCEL_')) {
      const eventId = action.replace('ADMIN_CONFIRM_CANCEL_', '');
      this.addMessage({ sender: 'bot', text: 'Processing cancellation... ⏳' });
      this.eventService.deleteEvent(eventId).subscribe({
        next: () => {
          this.botState = 'IDLE';
          this.addMessage({
            sender: 'bot',
            text: '✅ Event has been successfully cancelled and removed.',
            options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
          });
        },
        error: (err) => {
          this.botState = 'IDLE';
          this.addMessage({ sender: 'bot', text: '❌ Failed to cancel event: ' + (err.error?.message || 'Unknown error') });
        }
      });
    }
    else if (action === 'ADMIN_CREATE_START') {
      this.flowData = {};

      const email = this.authService.getEmail();

      if (!email) {
        this.botState = 'ADMIN_CREATE_EMAIL';
        this.addMessage({
          sender: 'bot',
          text: 'Before creating the event, please enter your **email address**:'
        });
      } else {
        this.flowData.email = email;
        this.botState = 'ADMIN_CREATE_TITLE';
        this.addMessage({
          sender: 'bot',
          text: 'Let\'s create a new event. First, enter the **event title**:'
        });
      }
    }
    // else if (action === 'ADMIN_CREATE_START') {
    //   this.botState = 'ADMIN_CREATE_TITLE';
    //   this.flowData = {};
    //   this.addMessage({ sender: 'bot', text: 'Let\'s create a new event. First, please enter the event **title**:' });
    // }
    else if (action === 'ADMIN_CREATE_CONFIRM') {
      this.submitEventcreation();
    }
    else if (action === 'ADMIN_CREATE_CANCEL') {
      this.botState = 'IDLE';
      this.flowData = {};
      this.addMessage({ sender: 'bot', text: 'Event creation cancelled.', options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }] });
    }
  }

  //   private handleAdminCreateFlow(text: string) {
  //     switch (this.botState) {
  //       case 'ADMIN_CREATE_TITLE':
  //         this.flowData.title = text;
  //         this.botState = 'ADMIN_CREATE_DESC';
  //         this.addMessage({ sender: 'bot', text: 'Great. Now, provide a short **description**:' });
  //         break;
  //       case 'ADMIN_CREATE_DESC':
  //         this.flowData.description = text;
  //         this.botState = 'ADMIN_CREATE_DATE';
  //         this.addMessage({ sender: 'bot', text: 'When is it happening? Provide a **date** (e.g. YYYY-MM-DD):' });
  //         break;
  //       case 'ADMIN_CREATE_DATE':
  //         this.flowData.date = text; // Simplistic date handling for chatbot
  //         this.botState = 'ADMIN_CREATE_CAT';
  //         this.addMessage({ sender: 'bot', text: 'What is the **category**? (e.g. Technical, Cultural, Workshop, Sports):' });
  //         break;
  //       case 'ADMIN_CREATE_CAT':
  //         this.flowData.category = text.toLowerCase();
  //         this.botState = 'ADMIN_CREATE_IMAGE';
  //         this.addMessage({ sender: 'bot', text: 'Finally, provide an **image URL** (or type "skip" for default):' });
  //         break;
  //       case 'ADMIN_CREATE_IMAGE':
  //         this.flowData.imageUrl = text.toLowerCase() === 'skip' ? '' : text;
  //         this.botState = 'ADMIN_CREATE_REVIEW';

  //         // Review step
  //         const summary = `Please confirm the event details:
  // - **Title**: ${this.flowData.title}
  // - **Desc**: ${this.flowData.description}
  // - **Date**: ${this.flowData.date}
  // - **Category**: ${this.flowData.category}`;
  //         this.addMessage({
  //           sender: 'bot',
  //           text: summary,
  //           options: [
  //             { label: '✅ Looks good! Create it', action: 'ADMIN_CREATE_CONFIRM' },
  //             { label: '❌ Cancel', action: 'ADMIN_CREATE_CANCEL' }
  //           ]
  //         });
  //         break;
  //     }
  //   }

  private handleAdminCreateFlow(text: string) {

    switch (this.botState) {

      case 'ADMIN_CREATE_EMAIL':
        this.flowData.email = text;
        this.botState = 'ADMIN_CREATE_TITLE';

        this.addMessage({
          sender: 'bot',
          text: 'Great! Now enter the **event title**:'
        });
        break;


      case 'ADMIN_CREATE_TITLE':
        this.flowData.title = text;
        this.botState = 'ADMIN_CREATE_DESC';

        this.addMessage({
          sender: 'bot',
          text: 'Nice! Provide a **short description** for the event:'
        });
        break;


      case 'ADMIN_CREATE_DESC':
        this.flowData.description = text;
        this.botState = 'ADMIN_CREATE_DATE';

        this.addMessage({
          sender: 'bot',
          text: 'When will the event happen?\nFormat: **YYYY-MM-DD**'
        });
        break;


      case 'ADMIN_CREATE_DATE':
        this.flowData.date = text;
        this.botState = 'ADMIN_CREATE_CAT';

        this.addMessage({
          sender: 'bot',
          text: 'Select the **event category**:',
          options: [
            { label: 'Technical', action: 'ADMIN_CAT_TECH' },
            { label: 'Workshop', action: 'ADMIN_CAT_WORKSHOP' },
            { label: 'Cultural', action: 'ADMIN_CAT_CULTURAL' },
            { label: 'Sports', action: 'ADMIN_CAT_SPORTS' }
          ]
        });
        break;


      case 'ADMIN_CREATE_CAT':
        this.flowData.category = text.toLowerCase();
        this.botState = 'ADMIN_CREATE_VENUE';

        this.addMessage({
          sender: 'bot',
          text: 'Where will the event take place? (Enter **venue name**)'
        });
        break;


      case 'ADMIN_CREATE_VENUE':
        this.flowData.venue = text;
        this.botState = 'ADMIN_CREATE_PARTICIPANTS';

        this.addMessage({
          sender: 'bot',
          text: 'Maximum number of participants allowed?'
        });
        break;


      case 'ADMIN_CREATE_PARTICIPANTS':
        this.flowData.participants = Number(text) || 100;
        this.botState = 'ADMIN_CREATE_IMAGE';

        this.addMessage({
          sender: 'bot',
          text: 'Provide an **image URL** or type **skip**.'
        });
        break;


      case 'ADMIN_CREATE_IMAGE':

        this.flowData.imageUrl = text.toLowerCase() === 'skip' ? '' : text;

        this.botState = 'ADMIN_CREATE_REVIEW';

        const summary = `
📋 Please confirm the event details

Title: ${this.flowData.title}
Description: ${this.flowData.description}
Category: ${this.flowData.category}
Venue: ${this.flowData.venue}
Date: ${this.flowData.date}
Participants: ${this.flowData.participants}
`;

        this.addMessage({
          sender: 'bot',
          text: summary,
          options: [
            { label: '✅ Create Event', action: 'ADMIN_CREATE_CONFIRM' },
            { label: '❌ Cancel', action: 'ADMIN_CREATE_CANCEL' }
          ]
        });

        break;
    }
>>>>>>> Stashed changes
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