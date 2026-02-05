import * as React from 'react';
import { MessageCircle, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface WhatsAppReminderButtonProps {
    type: 'team' | 'league';
    leagueName: string;
    className?: string;
    variant?: 'default' | 'outline' | 'ghost' | 'secondary';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function WhatsAppReminderButton({
    type,
    leagueName,
    className,
    variant = 'outline',
    size = 'sm',
}: WhatsAppReminderButtonProps) {
    const [open, setOpen] = React.useState(false);
    const [text, setText] = React.useState('');
    const [copied, setCopied] = React.useState(false);

    // Initialize text when dialog opens or props change
    React.useEffect(() => {
        if (open) {
            if (type === 'team') {
                setText(`Hey team! \n\nPlease add your activity for today and gain a point for the team! Let's go! \n\nLink: https://myfitnessleague.in`);
            } else {
                setText(`Hey ${leagueName} players! \n\nDid you add your activity today? Don't forget to log your activity/rest day and keep the streak alive! \n\nLink: https://myfitnessleague.in`);
            }
        }
    }, [open, type, leagueName]);

    const handleWhatsAppShare = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        setOpen(false);
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: type === 'team' ? 'Team Reminder' : 'League Reminder',
                    text: text,
                });
                setOpen(false);
            } catch (err) {
                // Ignore cancel
            }
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={variant}
                    size={size}
                    className={className}
                    title="Send Reminder"
                >
                    <MessageCircle className={`${size === 'icon' ? '' : 'sm:mr-2'} size-4 text-green-600`} />
                    {size !== 'icon' && <span className="hidden sm:inline">Send Reminder</span>}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Send Reminder</DialogTitle>
                    <DialogDescription>
                        Customize the message before sending it to your {type === 'team' ? 'team' : 'league'}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                            id="message"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="min-h-[120px] resize-none"
                        />
                    </div>
                </div>
                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:space-x-2">
                    <div className="flex gap-2 w-full sm:w-auto">
                        {typeof navigator !== 'undefined' && navigator.share && (
                            <Button variant="outline" onClick={handleNativeShare} className="flex-1 sm:flex-none">
                                <Share2 className="mr-2 size-4" />
                                Share
                            </Button>
                        )}
                        <Button variant="outline" size="icon" onClick={handleCopy} title="Copy text">
                            {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                        </Button>
                    </div>
                    <Button onClick={handleWhatsAppShare} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                        <MessageCircle className="mr-2 size-4" />
                        Send on WhatsApp
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
