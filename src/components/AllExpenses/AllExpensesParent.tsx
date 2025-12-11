import { AllExpenses } from "./AllExpenses";

export default function ExpensesPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="flex-1">
        <section className="w-full">
          <div className="container px-4 md:px-6">
            <AllExpenses />
          </div>
        </section>
      </main>
    </div>
  );
}
