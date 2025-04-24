import ClothingUpload from '@/components/Clothing/ClothingUpload';

export const metadata = {
  title: 'Add Item | Vestire',
};

export default function AddItemPage() {
  return (
    <div className="space-y-6">
      <ClothingUpload />
    </div>
  );
}