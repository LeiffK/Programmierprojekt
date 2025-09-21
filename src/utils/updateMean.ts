//Diese Funktion 

function updateMean(
    legacyMean:number,
    result:number,
    iteration:number
){
    return (legacyMean*iteration+result)/(iteration+1)
}