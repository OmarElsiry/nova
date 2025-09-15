interface ComingSoonProps {
  title?: string;
  description?: string;
}

const ComingSoon = ({ 
  title = "Coming Soon", 
  description = "This feature will be available shortly" 
}: ComingSoonProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Animated Circle */}
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-transparent animate-pulse"></div>
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/40 to-transparent animate-pulse delay-75"></div>
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/60 to-transparent animate-pulse delay-150"></div>
        <div className="absolute inset-12 rounded-full bg-primary/20 animate-pulse delay-200"></div>
      </div>
      
      <h2 className="text-2xl font-bold text-text-primary mb-3">
        {title}
      </h2>
      
      <p className="text-text-muted text-center text-sm max-w-sm">
        {description}
      </p>
    </div>
  );
};

export default ComingSoon;