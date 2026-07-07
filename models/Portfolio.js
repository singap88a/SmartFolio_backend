import mongoose from 'mongoose';

const PortfolioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  templateId: {
    type: String,
    required: true,
    enum: ['developer'],
    default: 'developer',
  },
  data: {
    name: String,
    jobTitle: String,
    bio: String,
    heroImage: String,
    logo: String,
    logoType: { type: String, enum: ['text', 'image'], default: 'text' },
    whatsapp: String,
    cvLink: String,
    navbarLinks: [{
      label: String,
      url: String,
    }],
    skills: [{
      name: String,
      icon: String,
    }],
    services: [{
      title: String,
      description: String,
      icon: String,
    }],
    projects: [{
      title: String,
      description: String,
      image: String,
      icon: String,
      skills: [String],
      link: String,
    }],
    socialLinks: {
      twitter: String,
      linkedin: String,
      github: String,
      instagram: String,
    },
    contact: {
      email: String,
      phone: String,
      address: String,
    },
    faqs: [{
      question: String,
      answer: String,
    }],
    testimonials: [{
      name: String,
      role: String,
      content: String,
      avatar: String,
    }],
    themeColor: String,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.Portfolio || mongoose.model('Portfolio', PortfolioSchema);
