#include <iostream>
#include <exception>
using namespace std;

struct ZeroError{
    int err;
    ZeroError(int e){err = e;}
};


int divide(int a,int b)
{
    if (b == 0)throw int(10);
    return a/b;
}


int main()
{
    try{
        int x = divide(10,0);
        cout << x << endl;
    }
    catch(int z){
        cout << "Exception: " << z << endl;
    }
}
