import Header from "components/ui/Header";

type LayoutProps = {
  children?: React.ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="h-screen">
      <Header />
      <main className="mt-4">{children}</main>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;
