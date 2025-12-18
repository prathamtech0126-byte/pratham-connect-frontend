import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Briefcase, DollarSign, Award, Heart } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  icon: React.ReactNode;
  features: string[];
}

const products: Product[] = [
  {
    id: "1",
    name: "IELTS Coaching",
    description: "Comprehensive IELTS preparation and coaching program",
    price: 15000,
    category: "Education",
    icon: <BookOpen className="w-6 h-6" />,
    features: ["4-week course", "Live classes", "Practice tests", "One-on-one guidance"],
  },
  {
    id: "2",
    name: "Visa Application",
    description: "Complete visa application assistance",
    price: 25000,
    category: "Immigration",
    icon: <Award className="w-6 h-6" />,
    features: ["Document preparation", "Form filling", "Interview coaching", "Application tracking"],
  },
  {
    id: "3",
    name: "Work Permit",
    description: "Work permit arrangement and guidance",
    price: 20000,
    category: "Employment",
    icon: <Briefcase className="w-6 h-6" />,
    features: ["Employer support letter", "Documentation", "Interview prep", "Follow-up support"],
  },
  {
    id: "4",
    name: "Travel Insurance",
    description: "Comprehensive travel health insurance",
    price: 8000,
    category: "Insurance",
    icon: <Heart className="w-6 h-6" />,
    features: ["Medical coverage", "Emergency assistance", "Baggage protection", "24/7 support"],
  },
  {
    id: "5",
    name: "Financial Services",
    description: "Bank account and financial documentation",
    price: 12000,
    category: "Finance",
    icon: <DollarSign className="w-6 h-6" />,
    features: ["Account opening", "Proof of funds", "Bank statement prep", "Financial guidance"],
  },
];

export default function Products() {
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleAddToClient = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one product",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `${selectedProducts.length} product(s) added to client`,
    });
    setSelectedProducts([]);
  };

  const totalPrice = products
    .filter((p) => selectedProducts.includes(p.id))
    .reduce((sum, p) => sum + p.price, 0);

  return (
    <PageWrapper
      title="Products & Services"
      breadcrumbs={[{ label: "Products & Services" }]}
    >
      <div className="space-y-6">
        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card
              key={product.id}
              className={`border-2 cursor-pointer transition-all ${
                selectedProducts.includes(product.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => handleSelectProduct(product.id)}
              data-testid={`card-product-${product.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {product.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <Badge variant="outline" className="mt-2">
                        {product.category}
                      </Badge>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => {}}
                    className="w-5 h-5 rounded border-primary"
                    data-testid={`checkbox-product-${product.id}`}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {product.description}
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Features
                  </p>
                  <ul className="space-y-1">
                    {product.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-muted-foreground flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-4 border-t border-border/40">
                  <p className="text-lg font-semibold text-primary">
                    ₹{product.price.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary and Action */}
        {selectedProducts.length > 0 && (
          <Card className="border-2 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle>Selected Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {products
                  .filter((p) => selectedProducts.includes(p.id))
                  .map((product) => (
                    <div
                      key={product.id}
                      className="flex justify-between items-center text-sm"
                      data-testid={`selected-product-${product.id}`}
                    >
                      <span>{product.name}</span>
                      <span className="font-semibold">
                        ₹{product.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
              <div className="pt-4 border-t border-primary/20 flex justify-between items-center">
                <span className="font-semibold">Total Amount</span>
                <span className="text-2xl font-bold text-primary">
                  ₹{totalPrice.toLocaleString()}
                </span>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedProducts([])}
                  className="flex-1"
                >
                  Clear Selection
                </Button>
                <Button
                  onClick={handleAddToClient}
                  className="flex-1"
                  data-testid="button-add-to-client"
                >
                  Add to Client
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
