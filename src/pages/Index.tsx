import { Construction } from "lucide-react";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Construction className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="text-3xl font-semibold text-foreground">Em Construção</h1>
        <p className="text-muted-foreground">Estamos trabalhando para trazer algo incrível. Volte em breve!</p>
      </div>
    </div>
  );
};

export default Index;
