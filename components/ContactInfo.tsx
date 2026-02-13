
import React, { useState, useEffect } from 'react';
import { Contact, AuthConfig } from '../types';
import { Avatar, Button, Card } from './ui/Shared';
import { X, Trash2, Code, Phone, Mail, Clock } from 'lucide-react';
import { fetchProfilePictureUrl } from '../services/evolutionClient';
import toast from 'react-hot-toast';

interface ContactInfoProps {
  contact: Contact;
  onClose: () => void;
  config?: AuthConfig;
}

const ContactInfo: React.FC<ContactInfoProps & { config?: AuthConfig }> = ({ contact, onClose, config }) => {
  const [currentAvatar, setCurrentAvatar] = useState(contact.avatarUrl);

  useEffect(() => {
    setCurrentAvatar(contact.avatarUrl);
    
    // If we have config, fetch latest avatar
    if (config && contact.number) {
        const loadPic = async () => {
             const url = await fetchProfilePictureUrl(config, contact.number);
             if (url) setCurrentAvatar(url);
        };
        loadPic();
    }
  }, [contact, config]);

  const showJson = () => {
    console.log(contact);
    toast.success("JSON logged to console");
  };

  const clearChat = () => {
    if (confirm("Are you sure? This is just a UI mock.")) {
        toast("Chat cleared (Mock)");
    }
  };

  return (
    <div className="w-full md:w-80 border-l border-border h-full bg-card overflow-y-auto flex flex-col fixed md:relative z-50 inset-0 md:inset-auto">
      <div className="p-4 flex items-center justify-between border-b border-border bg-card">
        <h3 className="font-semibold">Contact Info</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-6 flex flex-col items-center border-b border-border">
        <div className="h-24 w-24 mb-4">
             <Avatar src={currentAvatar} alt={contact.name} fallback={contact.name} />
        </div>
        <h2 className="text-xl font-bold text-center">{contact.name}</h2>
        <p className="text-muted-foreground text-sm mt-1">{contact.number}</p>
        
        <div className="flex gap-4 mt-6 w-full justify-center">
            <div className="flex flex-col items-center gap-1">
                 <Button variant="outline" className="h-10 w-10 rounded-full p-0"><Phone className="h-4 w-4"/></Button>
                 <span className="text-xs text-muted-foreground">Audio</span>
            </div>
            <div className="flex flex-col items-center gap-1">
                 <Button variant="outline" className="h-10 w-10 rounded-full p-0"><Mail className="h-4 w-4"/></Button>
                 <span className="text-xs text-muted-foreground">Email</span>
            </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="p-4 space-y-3 shadow-none border border-border/60 bg-muted/20">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Details</h4>
            <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Last seen: Today</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{contact.number}</span>
            </div>
        </Card>

        <div className="space-y-2 pt-4">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={showJson}>
                <Code className="h-4 w-4" />
                View Contact JSON
            </Button>
            <Button variant="destructive" className="w-full justify-start gap-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40" onClick={clearChat}>
                <Trash2 className="h-4 w-4" />
                Clear Chat History
            </Button>
        </div>
      </div>
    </div>
  );
};

export default ContactInfo;
