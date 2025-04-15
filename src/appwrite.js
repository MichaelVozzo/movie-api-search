import { Client, Databases, ID, Query } from "appwrite";
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(PROJECT_ID)

const database = new Databases(client);

export const updateSearchCount = async (searchTerm, movie) => {
    // Get the current top 5 before update to check later if they changed
    const oldTop5 = await getTrendingMovies();
    const oldTop5Terms = oldTop5.map(doc => doc.searchTerm);
    
    //1. Use Appwrite SDK to check if the search term exists in the database
    try {
        const result = await database.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.equal('searchTerm', searchTerm),
        ])
        //2. If it does, update the count
        if (result.documents.length > 0){
            const doc = result.documents[0];
            await database.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
                count: doc.count + 1,
            })
        //3. If it doesn't, create a new document with the search term and count as 1
        } else {
            await database.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
                searchTerm,
                count: 1,
                movie_id: movie.id,
                poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
            })
        }
        
        // Get the new top 5 after update
        const newTop5 = await getTrendingMovies();
        const newTop5Terms = newTop5.map(doc => doc.searchTerm);
        
        // Check if the top 5 items or their order has changed
        let hasChanged = false;
        if (oldTop5Terms.length !== newTop5Terms.length) {
            hasChanged = true;
        } else {
            for (let i = 0; i < oldTop5Terms.length; i++) {
                if (oldTop5Terms[i] !== newTop5Terms[i]) {
                    hasChanged = true;
                    break;
                }
            }
        }
        
        return hasChanged;
        
    } catch (error) {
        console.error(error);
        return false;
    }
}

export const getTrendingMovies = async () => {
    try {
        const result = await database.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.limit(5),
            Query.orderDesc("count"),
        ])
        return result.documents;
    } catch (error) {
        console.error(error);
        return [];
    }
}