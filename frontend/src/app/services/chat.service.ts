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

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  messages = signal<ChatMessage[]>([]);
  isOpen = signal<boolean>(false);
  navRequest = signal<string | null>(null);

  // State machine for multi-step flows
  private botState = 'IDLE';
  private flowData: any = {};

  constructor(
    private authService: AuthService,
    private router: Router,
    private eventService: EventService,
    private http: HttpClient
  ) { }

  toggleChat() {
    this.isOpen.set(!this.isOpen());
    if (this.isOpen() && this.messages().length === 0) {
      this.sendWelcomeMessage();
    }
  }

  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const newMessage: ChatMessage = {
      ...message,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, newMessage]);
  }

  clearChat() {
    this.messages.set([]);
    this.botState = 'IDLE';
    this.flowData = {};
    this.sendWelcomeMessage();
  }

  sendWelcomeMessage() {
    const role = this.authService.getRole();
    const isLoggedIn = this.authService.isLoggedIn();
    const fullName = this.authService.getFullName() || 'User';
    this.botState = 'IDLE';
    this.flowData = {};

    if (isLoggedIn && role === 'student') {
      this.addMessage({
        sender: 'bot',
        text: `Hi ${fullName} 👋 I can help you with events.\nWould you like to:`,
        options: [
          { label: '1️⃣ View all events', action: 'STUDENT_BROWSE' },
          { label: '2️⃣ My Schedule', action: 'STUDENT_SCHEDULE' },
          { label: '🏆 Leaderboard', action: 'STUDENT_LEADERBOARD' },
          { label: '🎲 Surprise Me!', action: 'STUDENT_SURPRISE' },
          { label: '✨ Event Wizard', action: 'STUDENT_WIZARD_START' }
        ]
      });
    } else if (isLoggedIn && role === 'college-admin') {
      this.addMessage({
        sender: 'bot',
        text: `Hello Admin ${fullName} 👋\nHow can I assist you today?`,
        options: [
          { label: '✏️ Create new event', action: 'ADMIN_CREATE_START' },
          { label: '📊 Manage my events', action: 'ADMIN_MANAGE' },
          { label: '❌ Cancel my event', action: 'ADMIN_CANCEL_FLOW' }
        ]
      });
    } else {
      this.addMessage({
        sender: 'bot',
        text: 'Hi! Please log in to access your personalized event hub.',
        options: [
          { label: '🔑 How to Login', action: 'AUTH_LOGIN' },
          { label: '📝 How to Register', action: 'AUTH_REGISTER' }
        ]
      });
    }
  }

  // sendWelcomeMessage() {
  //   const role = this.authService.getRole();
  //   const isLoggedIn = this.authService.isLoggedIn();
  //   this.botState = 'IDLE';
  //   this.flowData = {};

  //   if (isLoggedIn && role === 'student') {
  //     const email = this.authService.getEmail() || 'guest';
  //     const storageKey = `hasSeenOnboarding_${email}`;
  //     const hasSeen = localStorage.getItem(storageKey);

  //     if (!hasSeen) {
  //       // Trigger First-Time Student Onboarding
  //       this.addMessage({
  //         sender: 'bot',
  //         text: 'Welcome to Campus Event Hub! 🎉 I see this is your first time here. I\'m your virtual assistant.',
  //         options: [{ label: 'Next: Show me how', action: 'ONBOARD_STUDENT_NEXT' }]
  //       });
  //     } else {
  //       this.addMessage({
  //         sender: 'bot',
  //         text: 'Hi 👋 I can help you with events.\nWould you like to:',
  //         options: [
  //           { label: '1️⃣ View all events', action: 'STUDENT_BROWSE' },
  //           { label: '2️⃣ Filter by date', action: 'STUDENT_FILTER_DATE' },
  //           { label: '3️⃣ Filter by category', action: 'STUDENT_FILTER_CAT' },
  //           { label: '🏆 View Leaderboard', action: 'STUDENT_LEADERBOARD' },
  //           { label: '🎲 Surprise Me!', action: 'STUDENT_SURPRISE' },
  //           { label: '✨ Event Wizard Quiz', action: 'STUDENT_WIZARD_START' },
  //           { label: '📊 Take a Quick Poll', action: 'STUDENT_POLL_START' }
  //         ]
  //       });
  //     }
  //   } else if (isLoggedIn && role === 'college-admin') {
  //     const email = this.authService.getEmail() || 'admin';
  //     const storageKey = `hasSeenOnboarding_${email}`;
  //     const hasSeen = localStorage.getItem(storageKey);

  //     if (!hasSeen) {
  //       // Trigger First-Time Admin Onboarding
  //       this.addMessage({
  //         sender: 'bot',
  //         text: 'Welcome aboard, Admin! 🎓 I\'m so glad you\'re here to start organizing events.',
  //         options: [{ label: 'Next: Show me what I can do', action: 'ONBOARD_ADMIN_NEXT' }]
  //       });
  //     } else {
  //       this.addMessage({
  //         sender: 'bot',
  //         text: 'Hello Admin 👋\nHow can I assist you today?',
  //         options: [
  //           { label: '✏️ Create new event', action: 'ADMIN_CREATE_START' },
  //           { label: '📊 Manage created events', action: 'ADMIN_MANAGE' },
  //           { label: '❌ Cancel an event', action: 'ADMIN_CANCEL_FLOW' }
  //         ]
  //       });
  //     }
  //   } else if (isLoggedIn && role === 'superadmin') {
  //     this.addMessage({
  //       sender: 'bot',
  //       text: 'Welcome Super Admin. What would you like to do?',
  //       options: [
  //         { label: '📈 View Statistics', action: 'SUPER_STATS' },
  //         { label: '👥 Manage Users/Colleges', action: 'SUPER_USERS' }
  //       ]
  //     });
  //   } else {
  //     this.addMessage({
  //       sender: 'bot',
  //       text: 'Hi! Please log in to access your personalized event hub. How can I help?',
  //       options: [
  //         { label: '🔑 How to Login', action: 'AUTH_LOGIN' },
  //         { label: '📝 How to Register', action: 'AUTH_REGISTER' },
  //         { label: '👀 Preview Upcoming Events', action: 'GUEST_PREVIEW_EVENTS' }
  //       ]
  //     });
  //   }
  // }

  handleUserMessage(text: string) {
    // Add user message to UI
    this.addMessage({ sender: 'user', text });

    // Handle stateful flows
    if (this.botState.startsWith('ADMIN_CREATE_')) {
      this.handleAdminCreateFlow(text);
      return;
    }

    // NLP / Generic fallback
    const lowerText = text.toLowerCase();
    const role = this.authService.getRole();
    const isLoggedIn = this.authService.isLoggedIn();

    // NAV-ASSIST DETECTION
    if (lowerText.includes('go to') || lowerText.includes('navigate to') || lowerText.includes('show me my')) {
      if (lowerText.includes('profile')) { this.handleAction('NAV_PROFILE'); return; }
      if (lowerText.includes('notification')) { this.handleAction('NAV_NOTIFICATIONS'); return; }
      if (lowerText.includes('payment') || lowerText.includes('wallet')) { this.handleAction('NAV_PAYMENTS'); return; }
      if (lowerText.includes('event') || lowerText.includes('browse')) { this.handleAction('NAV_EVENTS'); return; }
      if (lowerText.includes('schedule') || lowerText.includes('registered')) { this.handleAction('NAV_SCHEDULE'); return; }
      if (lowerText.includes('overview') || lowerText.includes('home')) { this.handleAction('NAV_OVERVIEW'); return; }
    }

    if (lowerText.includes('hello') || lowerText.includes('hi')) {
      this.sendWelcomeMessage();
      return;
    }

    // STUDENT NLP MATCHING
    if (isLoggedIn && role === 'student') {
      if (lowerText.includes('register') || lowerText.includes('join') || lowerText.includes('upcoming')) {
        this.addMessage({ sender: 'bot', text: 'Sure! Here are some top upcoming events you can register for:' });
        this.handleAction('STUDENT_INLINE_EVENTS');
        return;
      }
      if (lowerText.includes('schedule') || lowerText.includes('my events') || lowerText.includes('registered')) {
        this.handleAction('STUDENT_SCHEDULE');
        return;
      }
      if (lowerText.includes('tech') || lowerText.includes('cultural') || lowerText.includes('sports')) {
        this.addMessage({ sender: 'bot', text: 'I noticed you mentioned a category! Let me take you to the listings page so you can explore those events.' });
        this.handleAction('STUDENT_BROWSE');
        return;
      }
    }

    // ADMIN NLP MATCHING
    if (isLoggedIn && role === 'college-admin') {
      if (lowerText.includes('cancel') || lowerText.includes('delete')) {
        this.handleAction('ADMIN_CANCEL_FLOW');
        return;
      }
    }

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
    this.addMessage({ sender: 'bot', text: 'Thinking... ⏳' });
    this.http.post('http://localhost:5000/api/chat/ask', { message: text, role }).subscribe({
      next: (res: any) => {
        // Remove the 'Thinking... ⏳' message
        const currentMessages = this.messages();
        if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].text === 'Thinking... ⏳') {
          this.messages.set(currentMessages.slice(0, -1));
        }

        this.addMessage({
          sender: 'bot',
          text: res.reply,
          options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
        });
      },
      error: () => {
        // Remove the 'Thinking... ⏳' message
        const currentMessages = this.messages();
        if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].text === 'Thinking... ⏳') {
          this.messages.set(currentMessages.slice(0, -1));
        }

        this.addMessage({
          sender: 'bot',
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
        this.eventService.getUserRegistrations().subscribe({
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
  }

  private submitEventcreation() {

    this.addMessage({
      sender: 'bot',
      text: 'Creating event... please wait ⏳'
    });

    const email = this.flowData.email || this.authService.getEmail();

    if (!email) {
      this.addMessage({
        sender: 'bot',
        text: '❌ Email missing. Please restart event creation.',
        options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
      });
      return;
    }

    const payload = {

      title: this.flowData.title,
      description: this.flowData.description,

      type: ['technical', 'cultural', 'sports', 'workshop', 'seminar']
        .includes(this.flowData.category)
        ? this.flowData.category
        : 'technical',

      category: 'college',

      venue: this.flowData.venue || 'TBD',

      startDate: new Date(this.flowData.date).toISOString(),
      endDate: new Date(this.flowData.date).toISOString(),

      registrationDeadline: new Date(this.flowData.date).toISOString(),

      maxParticipants: this.flowData.participants || 100,

      imageUrl: this.flowData.imageUrl || undefined,

      registrationFee: 0,

      organizer: this.authService.getFullName() || 'College Admin',

      contactEmail: email
    };

    this.eventService.createEvent(payload).subscribe({

      next: () => {

        this.botState = 'IDLE';
        this.flowData = {};

        this.addMessage({
          sender: 'bot',
          text: '🎉 Event created successfully!',
          options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
        });
      },

      error: (err) => {

        this.addMessage({
          sender: 'bot',
          text: '❌ Failed to create event: ' + (err.error?.message || 'Unknown error'),
          options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
        });
      }
    });
  }

  // private submitEventcreation() {
  //   this.addMessage({ sender: 'bot', text: 'Creating event... please wait ⏳' });

  //   // Map basic bot data to full event API expectations
  //   const payload = {
  //     title: this.flowData.title,
  //     description: this.flowData.description,
  //     type: ['technical', 'cultural', 'sports', 'workshop', 'seminar'].includes(this.flowData.category) ? this.flowData.category : 'technical',
  //     category: 'college',
  //     venue: 'TBD',
  //     startDate: new Date(this.flowData.date || new Date()).toISOString(),
  //     endDate: new Date(this.flowData.date || new Date()).toISOString(),
  //     registrationDeadline: new Date(this.flowData.date || new Date()).toISOString(),
  //     maxParticipants: 100,
  //     imageUrl: this.flowData.imageUrl || undefined,
  //     registrationFee: 0,

  //     // --- CHANGES START HERE ---
  //     // 1. Use the actual name of the logged-in user
  //     organizer: this.authService.getFullName() || 'College Admin',

  //     // 2. Add the contactEmail so the chatbot can filter "My Events" later
  //     contactEmail: this.authService.getEmail()
  //     // --- CHANGES END HERE ---
  //   };

  //   this.eventService.createEvent(payload).subscribe({
  //     next: (res) => {
  //       this.botState = 'IDLE';
  //       this.flowData = {};
  //       this.addMessage({
  //         sender: 'bot',
  //         text: '🎉 Event created successfully! It is now live.',
  //         options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
  //       });
  //     },
  //     error: (err) => {
  //       this.addMessage({
  //         sender: 'bot',
  //         text: '❌ Failed to create event: ' + (err.error?.message || 'Unknown error'),
  //         options: [{ label: '🏠 Main Menu', action: 'MAIN_MENU' }]
  //       });
  //     }
  //   });
  // }
}
